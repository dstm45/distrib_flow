import React, { useState, useEffect } from 'react'
import bcrypt from 'bcryptjs'
import './App.css'
import FranchiseOwnerPanel from './FranchiseOwnerPanel'
import VendeurPanel from './VendeurPanel'

// Types based on Go schemas
interface UserPublicDatum {
  uuid: string
  email: string
  role: 'admin' | 'franchise_owner' | 'vendeur'
  isAdminRole?: boolean // Checked via GetAdmin or similar checks
}

interface Franchise {
  uuid: string
  created_at: string
}

interface OwnerDetail {
  user_uuid: string
  email: string
}

interface Vendeur {
  user_uuid: string
  franchise_uuid: string
}

interface ToastMessage {
  id: string
  text: string
  type: 'success' | 'error'
}

function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('df_admin_auth') === 'true'
  })
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState(() => {
    return localStorage.getItem('df_admin_email') || ''
  })
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'franchise_owner' | 'vendeur' | null>(() => {
    return (localStorage.getItem('df_user_role') as any) || null
  })
  const [currentUserUuid, setCurrentUserUuid] = useState<string>(() => {
    return localStorage.getItem('df_user_uuid') || ''
  })

  // Global loading
  const [dataLoading, setDataLoading] = useState(false)

  // Navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'franchises' | 'users' | 'supervision'>('supervision')

  // Lists
  const [users, setUsers] = useState<UserPublicDatum[]>([])
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [franchiseOwners, setFranchiseOwners] = useState<Record<string, OwnerDetail[]>>({}) // franchiseUuid -> OwnerDetail[]
  const [franchiseVendeurs, setFranchiseVendeurs] = useState<Record<string, Vendeur[]>>({}) // franchiseUuid -> Vendeur[]
  const [adminsMap, setAdminsMap] = useState<Record<string, boolean>>({}) // userUuid -> is_admin_in_admins_table

  // Supervision stats
  interface FranchiseStats {
    total_revenue: number
    total_sales: number
    total_sellers: number
    top_products: {
      uuid: string
      name: string
      price: number
      sales_count: number
      revenue: number
    }[]
    top_sellers: {
      uuid: string
      email: string
      sales_count: number
      revenue: number
    }[]
    recent_sales: {
      uuid: string
      facture_uuid: string
      vendeur_uuid: string
      vendeur_email: string
      product_name: string
      price: number
    }[]
  }

  const [allFranchiseStats, setAllFranchiseStats] = useState<Record<string, FranchiseStats>>({})
  const [selectedSupervisionFranchiseUuid, setSelectedSupervisionFranchiseUuid] = useState<string>('')

  // Forms state
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState<'admin' | 'franchise_owner' | 'vendeur'>('vendeur')
  const [creatingUser, setCreatingUser] = useState(false)

  // Add owner & vendeur state maps (franchiseUuid -> selectedUserUuid)
  const [selectedOwnerToAdd, setSelectedOwnerToAdd] = useState<Record<string, string>>({})
  const [selectedVendeurToAdd, setSelectedVendeurToAdd] = useState<Record<string, string>>({})

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (text: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  // Check authentication on load
  useEffect(() => {
    checkCurrentUser()
  }, [])

  useEffect(() => {
    if (isAuthenticated && currentUserRole === 'admin') {
      loadAllData()
    }
  }, [isAuthenticated, currentUserRole])

  const checkCurrentUser = async () => {
    try {
      const res = await fetch('/auth/me', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setIsAuthenticated(true)
        setCurrentUserEmail(data.email)
        setCurrentUserRole(data.role)
        setCurrentUserUuid(data.uuid)
        localStorage.setItem('df_admin_auth', 'true')
        localStorage.setItem('df_admin_email', data.email)
        localStorage.setItem('df_user_role', data.role)
        localStorage.setItem('df_user_uuid', data.uuid)
      } else {
        if (localStorage.getItem('df_admin_auth') === 'true') {
          handleSessionExpired()
        } else {
          setIsAuthenticated(false)
        }
      }
    } catch (err) {
      if (!localStorage.getItem('df_admin_auth')) {
        setIsAuthenticated(false)
      }
    }
  }

  const loadAllData = async () => {
    setDataLoading(true)
    try {
      // 1. Fetch Users
      const usersRes = await fetch('/admin/users', { credentials: 'include' })
      if (usersRes.status === 401 || usersRes.status === 403) {
        handleSessionExpired()
        return
      }
      if (!usersRes.ok) throw new Error('Impossible de charger les utilisateurs')
      const usersData: UserPublicDatum[] = await usersRes.json()
      setUsers(usersData || [])

      // Check admin sub-roles for users
      const tempAdminsMap: Record<string, boolean> = {}
      await Promise.all(
        (usersData || []).map(async (u) => {
          if (u.role === 'admin') {
            try {
              const res = await fetch(`/admin/admins/${u.uuid}`, { credentials: 'include' })
              if (res.ok) {
                tempAdminsMap[u.uuid] = true
              }
            } catch (err) {
              // Ignore failure if not in admin table
            }
          }
        })
      )
      setAdminsMap(tempAdminsMap)

      // 2. Fetch Franchises
      const franchisesRes = await fetch('/franchises', { credentials: 'include' })
      if (!franchisesRes.ok) throw new Error('Impossible de charger les franchises')
      const franchisesData: Franchise[] = await franchisesRes.json()
      setFranchises(franchisesData || [])

      // 3. Fetch Owners & Vendeurs for each franchise
      const ownersMap: Record<string, OwnerDetail[]> = {}
      const vendeursMap: Record<string, Vendeur[]> = {}

      await Promise.all(
        (franchisesData || []).map(async (f) => {
          // Fetch Owners
          try {
            const ownersRes = await fetch(`/franchises/${f.uuid}/owners`, { credentials: 'include' })
            if (ownersRes.ok) {
              const ownersData: OwnerDetail[] = await ownersRes.json()
              ownersMap[f.uuid] = ownersData || []
            }
          } catch (e) {
            console.error(`Error loading owners for ${f.uuid}`, e)
          }

          // Fetch Vendeurs
          try {
            const vendeursRes = await fetch(`/franchises/${f.uuid}/vendeurs`, { credentials: 'include' })
            if (vendeursRes.ok) {
              const vendeursData: Vendeur[] = await vendeursRes.json()
              vendeursMap[f.uuid] = vendeursData || []
            }
          } catch (e) {
            console.error(`Error loading vendeurs for ${f.uuid}`, e)
          }
        })
      )

      // Fetch stats for all franchises
      const statsMap: Record<string, FranchiseStats> = {}
      await Promise.all(
        (franchisesData || []).map(async (f) => {
          try {
            const res = await fetch(`/franchises/${f.uuid}/stats`, { credentials: 'include' })
            if (res.ok) {
              statsMap[f.uuid] = await res.json()
            }
          } catch (e) {
            console.error(`Error loading stats for ${f.uuid}`, e)
          }
        })
      )

      setAllFranchiseStats(statsMap)
      setFranchiseOwners(ownersMap)
      setFranchiseVendeurs(vendeursMap)
    } catch (err: any) {
      addToast(err.message || 'Erreur lors du chargement des données', 'error')
    } finally {
      setDataLoading(false)
    }
  }

  const handleSessionExpired = () => {
    setIsAuthenticated(false)
    setCurrentUserEmail('')
    setCurrentUserRole(null)
    setCurrentUserUuid('')
    localStorage.removeItem('df_admin_auth')
    localStorage.removeItem('df_admin_email')
    localStorage.removeItem('df_user_role')
    localStorage.removeItem('df_user_uuid')
    addToast('Session expirée ou non autorisée. Veuillez vous reconnecter.', 'error')
  }

  // Auth Operations
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) {
      addToast('Veuillez remplir tous les champs', 'error')
      return
    }

    setAuthLoading(true)
    try {
      const res = await fetch('/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
        credentials: 'include',
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Identifiants invalides')
      }

      const userData = await res.json()

      setIsAuthenticated(true)
      setCurrentUserEmail(loginEmail)
      setCurrentUserRole(userData.role)
      setCurrentUserUuid(userData.uuid)

      localStorage.setItem('df_admin_auth', 'true')
      localStorage.setItem('df_admin_email', loginEmail)
      localStorage.setItem('df_user_role', userData.role)
      localStorage.setItem('df_user_uuid', userData.uuid)

      addToast('Connexion réussie !', 'success')
      setLoginPassword('')
    } catch (err: any) {
      addToast(err.message || 'Erreur lors de la connexion', 'error')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST', credentials: 'include' })
    } catch (err) {
      // Ignore network errors on logout
    }
    setIsAuthenticated(false)
    setCurrentUserEmail('')
    setCurrentUserRole(null)
    setCurrentUserUuid('')
    localStorage.removeItem('df_admin_auth')
    localStorage.removeItem('df_admin_email')
    localStorage.removeItem('df_user_role')
    localStorage.removeItem('df_user_uuid')
    addToast('Déconnexion réussie', 'success')
  }

  // User Operations
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserEmail || !newUserPassword) {
      addToast('L\'email et le mot de passe sont requis', 'error')
      return
    }

    setCreatingUser(true)
    try {
      // 1. Generate bcrypt password hash on client
      const salt = bcrypt.genSaltSync(10)
      const passwordHash = bcrypt.hashSync(newUserPassword, salt)

      // 2. Create User
      const res = await fetch('/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail,
          password_hash: passwordHash,
          role: newUserRole,
        }),
        credentials: 'include',
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Erreur lors de la création de l\'utilisateur')
      }

      const createdUser: UserPublicDatum = await res.json()
      addToast(`Utilisateur ${createdUser.email} créé avec succès !`, 'success')

      // 3. If role is Admin, automatically call CreateAdmin to add to admins table
      if (newUserRole === 'admin') {
        const adminRes = await fetch('/admin/admins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: createdUser.uuid }),
          credentials: 'include',
        })
        if (adminRes.ok) {
          addToast('Rôle Administrateur enregistré avec succès !', 'success')
        }
      }

      // Reset form & reload
      setNewUserEmail('')
      setNewUserPassword('')
      setNewUserRole('vendeur')
      loadAllData()
    } catch (err: any) {
      addToast(err.message || 'Erreur lors de la création', 'error')
    } finally {
      setCreatingUser(false)
    }
  }

  const handleToggleAdminStatus = async (user: UserPublicDatum) => {
    const isCurrentlyAdmin = adminsMap[user.uuid]
    try {
      if (isCurrentlyAdmin) {
        // Demote admin role
        const res = await fetch(`/admin/admins/${user.uuid}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Impossible de révoquer le rôle administrateur')
        addToast(`Rôle administrateur révoqué pour ${user.email}`, 'success')
      } else {
        // Promote admin role
        const res = await fetch('/admin/admins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.uuid }),
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Impossible de promouvoir l\'utilisateur')
        addToast(`Utilisateur ${user.email} promu administrateur`, 'success')
      }
      loadAllData()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  // Franchise Operations
  const handleCreateFranchise = async () => {
    try {
      const res = await fetch('/franchises', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Impossible de créer la franchise')
      await res.json()
      addToast(`Franchise créée avec succès !`, 'success')
      loadAllData()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  const handleDeleteFranchise = async (uuid: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette franchise ?')) return

    try {
      const res = await fetch(`/franchises/${uuid}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Impossible de supprimer la franchise')
      addToast('Franchise supprimée avec succès', 'success')
      loadAllData()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  // Owner Operations
  const handleAddOwner = async (franchiseUuid: string) => {
    const userId = selectedOwnerToAdd[franchiseUuid]
    if (!userId) {
      addToast('Veuillez sélectionner un propriétaire', 'error')
      return
    }

    try {
      const res = await fetch(`/franchises/${franchiseUuid}/owners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Impossible d\'associer le propriétaire')
      addToast('Propriétaire associé avec succès', 'success')
      setSelectedOwnerToAdd(prev => ({ ...prev, [franchiseUuid]: '' }))
      loadAllData()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  const handleRemoveOwner = async (franchiseUuid: string, userUuid: string) => {
    if (!confirm('Retirer ce propriétaire de la franchise ?')) return

    try {
      const res = await fetch(`/franchises/${franchiseUuid}/owners/${userUuid}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Impossible de retirer le propriétaire')
      addToast('Propriétaire retiré', 'success')
      loadAllData()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  // Vendeur Operations
  const handleAddVendeur = async (franchiseUuid: string) => {
    const userId = selectedVendeurToAdd[franchiseUuid]
    if (!userId) {
      addToast('Veuillez sélectionner un vendeur', 'error')
      return
    }

    try {
      // Check if the user is already a vendedor of this or another franchise
      const isAlreadyVendeur = Object.values(franchiseVendeurs).flat().find(v => v.user_uuid === userId)

      if (isAlreadyVendeur) {
        // Update current mapping using PATCH /vendeurs/{userId}
        const res = await fetch(`/vendeurs/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ franchise_id: franchiseUuid }),
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Impossible de transférer le vendeur')
        addToast('Franchise du vendeur mise à jour', 'success')
      } else {
        // Create new seller map using POST /vendeurs
        const res = await fetch('/vendeurs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, franchise_id: franchiseUuid }),
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Impossible d\'associer le vendeur')
        addToast('Vendeur associé avec succès', 'success')
      }
      setSelectedVendeurToAdd(prev => ({ ...prev, [franchiseUuid]: '' }))
      loadAllData()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  const handleRemoveVendeur = async (userUuid: string) => {
    if (!confirm('Retirer ce vendeur de sa franchise ?')) return

    try {
      const res = await fetch(`/vendeurs/${userUuid}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Impossible de retirer le vendeur')
      addToast('Vendeur retiré de la franchise', 'success')
      loadAllData()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  // Email helper lookup
  const getUserEmail = (uuid: string): string => {
    const found = users.find((u) => u.uuid === uuid)
    return found ? found.email : 'Utilisateur Inconnu'
  }

  // Filter lists of candidates
  const getCandidateOwnersForFranchise = (franchiseUuid: string) => {
    const currentOwners = franchiseOwners[franchiseUuid] || []
    const currentOwnerIds = currentOwners.map(o => o.user_uuid)
    return users.filter(
      (u) => u.role === 'franchise_owner' && !currentOwnerIds.includes(u.uuid)
    )
  }

  const getCandidateVendeursForFranchise = (franchiseUuid: string) => {
    const currentVendeurs = franchiseVendeurs[franchiseUuid] || []
    const currentVendeurIds = currentVendeurs.map(v => v.user_uuid)
    return users.filter(
      (u) => u.role === 'vendeur' && !currentVendeurIds.includes(u.uuid)
    )
  }

  const getGroupedRecentSales = (sales: any[]) => {
    interface GroupedRecentSale {
      facture_uuid: string;
      vendeur_email: string;
      items: {
        name: string;
        price: number;
        quantity: number;
      }[];
      total: number;
    }
    const groups: Record<string, GroupedRecentSale> = {};
    (sales || []).forEach((sale) => {
      if (!groups[sale.facture_uuid]) {
        groups[sale.facture_uuid] = {
          facture_uuid: sale.facture_uuid,
          vendeur_email: sale.vendeur_email,
          items: [],
          total: 0,
        };
      }
      const g = groups[sale.facture_uuid];
      const existingItem = g.items.find((it) => it.name === sale.product_name);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        g.items.push({
          name: sale.product_name,
          price: sale.price,
          quantity: 1,
        });
      }
      g.total += sale.price;
    });
    return Object.values(groups);
  };

  // Render Login Layout
  if (!isAuthenticated) {
    return (
      <div className="auth-container animate-fade-in">
        <div className="auth-card glass-panel">
          <div className="auth-header">
            <div className="auth-logo">DistribFlow</div>
            <div className="auth-subtitle">Console d'Administration du Réseau</div>
          </div>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="login-email">Adresse Email</label>
              <input
                id="login-email"
                type="email"
                placeholder="admin@distribflow.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="login-password">Mot de passe</label>
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary auth-button"
              disabled={authLoading}
            >
              {authLoading ? (
                <>
                  <div className="spinner" />
                  Authentification...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        </div>
        {/* Render Toasts inside Login too */}
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              {toast.type === 'success' ? '✓' : '✗'} {toast.text}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Render Franchise Owner Dashboard
  if (currentUserRole === 'franchise_owner') {
    return (
      <FranchiseOwnerPanel
        currentUserEmail={currentUserEmail}
        handleLogout={handleLogout}
        addToast={addToast}
      />
    )
  }

  // Render Vendeur Dashboard
  if (currentUserRole === 'vendeur') {
    return (
      <VendeurPanel
        currentUserEmail={currentUserEmail}
        handleLogout={handleLogout}
        addToast={addToast}
      />
    )
  }

  // Render Main Layout
  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">DistribFlow</div>
        <nav className="sidebar-menu">
          <button
            className={`menu-item ${activeTab === 'supervision' ? 'active' : ''}`}
            onClick={() => setActiveTab('supervision')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
              <path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
            Supervision Globale
          </button>
          <button
            className={`menu-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg>
            Vue d'ensemble
          </button>
          <button
            className={`menu-item ${activeTab === 'franchises' ? 'active' : ''}`}
            onClick={() => setActiveTab('franchises')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M3 10h18M5 10V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5M10 21V14a2 2 0 0 1 2-2s0 0 0 0a2 2 0 0 1 2 2v7" />
            </svg>
            Franchises
          </button>
          <button
            className={`menu-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Utilisateurs & Admins
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <span className="user-email">{currentUserEmail}</span>
            <span className="user-role">ADMINISTRATEUR</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ID: {currentUserUuid}</span>
          </div>
          <button className="btn-secondary btn-logout" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Header */}
        <header className="content-header">
          <div>
            <h1>
              {activeTab === 'supervision' && 'Supervision Globale'}
              {activeTab === 'overview' && "Vue d'ensemble"}
              {activeTab === 'franchises' && 'Gestion des Franchises'}
              {activeTab === 'users' && 'Membres & Utilisateurs'}
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {activeTab === 'supervision' && 'Indicateurs financiers et suivi complet de toutes les franchises'}
              {activeTab === 'overview' && 'Rapport des activités et des entités en temps réel'}
              {activeTab === 'franchises' && 'Créez des franchises et associez les propriétaires et vendeurs'}
              {activeTab === 'users' && 'Enregistrez de nouveaux membres et gérez les rôles systèmes'}
            </p>
          </div>

          <button className="btn-secondary" onClick={loadAllData} disabled={dataLoading}>
            <svg
              className={dataLoading ? 'spinner' : ''}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Actualiser
          </button>
        </header>

        {/* Global Loading Spinner */}
        {dataLoading && users.length === 0 && (
          <div className="loading-container glass-panel">
            <div className="spinner spinner-large" />
            <span>Chargement des données du réseau...</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        <div className={`tab-content ${activeTab === 'overview' ? 'active' : ''} animate-fade-in`}>
          <div className="stats-grid">
            <div className="stat-card glass-panel">
              <div className="stat-title">Utilisateurs Enregistrés</div>
              <div className="stat-value">{users.length}</div>
            </div>
            <div className="stat-card glass-panel">
              <div className="stat-title">Franchises Actives</div>
              <div className="stat-value">{franchises.length}</div>
            </div>
            <div className="stat-card glass-panel">
              <div className="stat-title">Propriétaires (Owners)</div>
              <div className="stat-value">
                {users.filter((u) => u.role === 'franchise_owner').length}
              </div>
            </div>
            <div className="stat-card glass-panel">
              <div className="stat-title">Vendeurs de terrain</div>
              <div className="stat-value">
                {users.filter((u) => u.role === 'vendeur').length}
              </div>
            </div>
          </div>

          <div className="sections-grid">
            {/* Database status and summary */}
            <div className="list-panel glass-panel">
              <div className="panel-header">
                <h3 className="card-title">État du système</h3>
              </div>
              <table className="data-table">
                <tbody>
                  <tr>
                    <th>Base de données</th>
                    <td>
                      <span className="badge badge-vendeur">Connecté</span>
                    </td>
                  </tr>
                  <tr>
                    <th>Serveur API</th>
                    <td>
                      <code style={{ fontSize: '13px' }}>http://localhost:8888</code>
                    </td>
                  </tr>
                  <tr>
                    <th>Administrateurs Système</th>
                    <td>
                      {users.filter((u) => u.role === 'admin').map(u => (
                        <div key={u.uuid} style={{ fontSize: '14px', margin: '4px 0' }}>
                          • {u.email} <span className="table-uuid">({u.uuid})</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Quick Actions Panel */}
            <div className="form-panel glass-panel">
              <h3 className="card-title" style={{ marginBottom: '20px' }}>Actions Rapides</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button className="btn-primary" onClick={handleCreateFranchise} style={{ width: '100%' }}>
                  Créer une Franchise
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setActiveTab('users')}
                  style={{ width: '100%' }}
                >
                  Ajouter un Membre
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 2: FRANCHISES */}
        <div className={`tab-content ${activeTab === 'franchises' ? 'active' : ''} animate-fade-in`}>
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-start' }}>
            <button className="btn-primary" onClick={handleCreateFranchise}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Créer une Nouvelle Franchise
            </button>
          </div>

          {franchises.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Aucune franchise active enregistrée sur le réseau. Cliquez sur le bouton ci-dessus pour en créer une.
            </div>
          ) : (
            <div>
              {franchises.map((f) => {
                const ownersList = franchiseOwners[f.uuid] || []
                const vendeursList = franchiseVendeurs[f.uuid] || []

                const candidateOwners = getCandidateOwnersForFranchise(f.uuid)
                const candidateVendeurs = getCandidateVendeursForFranchise(f.uuid)

                return (
                  <div key={f.uuid} className="franchise-card glass-panel">
                    <div className="franchise-card-header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '18px' }}>Franchise</span>
                          <span className="franchise-id">{f.uuid}</span>
                        </div>
                        <div className="franchise-date">
                          Créée le : {new Date(f.created_at).toLocaleDateString()} at{' '}
                          {new Date(f.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                      <button
                        className="btn-danger btn-icon"
                        onClick={() => handleDeleteFranchise(f.uuid)}
                        title="Supprimer la Franchise"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>

                    <div className="franchise-relations">
                      {/* Owners Column */}
                      <div className="relation-section">
                        <div className="relation-header">
                          <span>Propriétaires ({ownersList.length})</span>
                        </div>
                        <div className="relation-list">
                          {ownersList.length === 0 ? (
                            <div className="no-relations">Aucun propriétaire associé</div>
                          ) : (
                            ownersList.map((owner) => (
                              <div key={owner.user_uuid} className="relation-item">
                                <div>
                                  <div className="relation-email" title={owner.email}>
                                    {owner.email}
                                  </div>
                                  <div className="relation-uuid">{owner.user_uuid}</div>
                                </div>
                                <button
                                  className="btn-danger btn-icon"
                                  style={{ padding: '4px' }}
                                  onClick={() => handleRemoveOwner(f.uuid, owner.user_uuid)}
                                  title="Dissocier ce propriétaire"
                                >
                                  ×
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add Owner Form */}
                        <div className="inline-form">
                          <select
                            value={selectedOwnerToAdd[f.uuid] || ''}
                            onChange={(e) =>
                              setSelectedOwnerToAdd((prev) => ({
                                ...prev,
                                [f.uuid]: e.target.value,
                              }))
                            }
                          >
                            <option value="">Associer un propriétaire...</option>
                            {candidateOwners.map((owner) => (
                              <option key={owner.uuid} value={owner.uuid}>
                                {owner.email}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn-secondary"
                            onClick={() => handleAddOwner(f.uuid)}
                            disabled={!selectedOwnerToAdd[f.uuid]}
                          >
                            Associer
                          </button>
                        </div>
                      </div>

                      {/* Vendeurs Column */}
                      <div className="relation-section">
                        <div className="relation-header">
                          <span>Vendeurs ({vendeursList.length})</span>
                        </div>
                        <div className="relation-list">
                          {vendeursList.length === 0 ? (
                            <div className="no-relations">Aucun vendeur associé</div>
                          ) : (
                            vendeursList.map((v) => (
                              <div key={v.user_uuid} className="relation-item">
                                <div>
                                  <div className="relation-email" title={getUserEmail(v.user_uuid)}>
                                    {getUserEmail(v.user_uuid)}
                                  </div>
                                  <div className="relation-uuid">{v.user_uuid}</div>
                                </div>
                                <button
                                  className="btn-danger btn-icon"
                                  style={{ padding: '4px' }}
                                  onClick={() => handleRemoveVendeur(v.user_uuid)}
                                  title="Dissocier ce vendeur"
                                >
                                  ×
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add Vendeur Form */}
                        <div className="inline-form">
                          <select
                            value={selectedVendeurToAdd[f.uuid] || ''}
                            onChange={(e) =>
                              setSelectedVendeurToAdd((prev) => ({
                                ...prev,
                                [f.uuid]: e.target.value,
                              }))
                            }
                          >
                            <option value="">Associer un vendeur...</option>
                            {candidateVendeurs.map((vend) => (
                              <option key={vend.uuid} value={vend.uuid}>
                                {vend.email}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn-secondary"
                            onClick={() => handleAddVendeur(f.uuid)}
                            disabled={!selectedVendeurToAdd[f.uuid]}
                          >
                            Associer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* TAB 4: SUPERVISION */}
        <div className={`tab-content ${activeTab === 'supervision' ? 'active' : ''} animate-fade-in`}>
          {/* Global Statistics Summary */}
          <div className="stats-grid" style={{ marginBottom: '30px' }}>
            <div className="stat-card glass-panel" style={{ borderLeft: '4px solid var(--success)' }}>
              <div className="stat-title">CA Global Cumulé</div>
              <div className="stat-value" style={{ fontSize: '28px', marginTop: '10px' }}>
                {(() => {
                  const sum = Object.values(allFranchiseStats).reduce((acc, curr) => acc + (curr.total_revenue || 0), 0)
                  return sum.toLocaleString('fr-CD', { style: 'currency', currency: 'CDF' })
                })()}
              </div>
            </div>

            <div className="stat-card glass-panel" style={{ borderLeft: '4px solid var(--secondary)' }}>
              <div className="stat-title">Ventes Totales Réseau</div>
              <div className="stat-value" style={{ fontSize: '28px', marginTop: '10px' }}>
                {Object.values(allFranchiseStats).reduce((acc, curr) => acc + (curr.total_sales || 0), 0)}
              </div>
            </div>

            <div className="stat-card glass-panel" style={{ borderLeft: '4px solid var(--border-focus)' }}>
              <div className="stat-title">Vendeurs Actifs</div>
              <div className="stat-value" style={{ fontSize: '28px', marginTop: '10px' }}>
                {Object.values(allFranchiseStats).reduce((acc, curr) => acc + (curr.total_sellers || 0), 0)}
              </div>
            </div>

            <div className="stat-card glass-panel" style={{ borderLeft: '4px solid var(--text-muted)' }}>
              <div className="stat-title">Nombre de Franchises</div>
              <div className="stat-value" style={{ fontSize: '28px', marginTop: '10px' }}>
                {franchises.length}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }} className="sections-grid">
            {/* Left Box: List of all franchises with detailed stats */}
            <div className="list-panel glass-panel">
              <div className="panel-header" style={{ marginBottom: '20px' }}>
                <h3 className="card-title">Supervision des Franchises</h3>
              </div>

              {franchises.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Aucune franchise enregistrée.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {franchises.map((f) => {
                    const fStats = allFranchiseStats[f.uuid]
                    const isSelected = selectedSupervisionFranchiseUuid === f.uuid
                    const revenue = fStats ? (fStats.total_revenue || 0) : 0
                    const sales = fStats ? (fStats.total_sales || 0) : 0
                    const ownersList = franchiseOwners[f.uuid] || []
                    const vendeursList = franchiseVendeurs[f.uuid] || []

                    return (
                      <div
                        key={f.uuid}
                        className="glass-panel"
                        onClick={() => setSelectedSupervisionFranchiseUuid(f.uuid)}
                        style={{
                          padding: '16px',
                          cursor: 'pointer',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                          background: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 'bold' }}>
                            Franchise: {f.uuid.substring(0, 8)}...
                          </span>
                          <span className="badge" style={{ fontSize: '11px' }}>
                            {ownersList.length} Prop. / {vendeursList.length} Vend.
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                          <div>
                            <span style={{ color: 'var(--text-secondary)' }}>Chiffre d'Affaires: </span>
                            <strong style={{ color: 'var(--success)' }}>
                              {revenue.toLocaleString('fr-CD', { style: 'currency', currency: 'CDF' })}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)' }}>Ventes: </span>
                            <strong>{sales}</strong>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right Box: Selected Franchise Deep Dive */}
            <div className="list-panel glass-panel">
              <div className="panel-header" style={{ marginBottom: '20px' }}>
                <h3 className="card-title">Détails de la Franchise</h3>
              </div>

              {!selectedSupervisionFranchiseUuid ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  Sélectionnez une franchise à gauche pour inspecter ses indicateurs en détail.
                </div>
              ) : (
                (() => {
                  const fUuid = selectedSupervisionFranchiseUuid
                  const fStats = allFranchiseStats[fUuid]
                  const ownersList = franchiseOwners[fUuid] || []
                  const vendeursList = franchiseVendeurs[fUuid] || []

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                          UUID Complet de la Franchise
                        </h4>
                        <div style={{ padding: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '12px', userSelect: 'all' }}>
                          {fUuid}
                        </div>
                      </div>

                      {/* Owners & Vendeurs list */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Propriétaires ({ownersList.length})
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {ownersList.length === 0 ? (
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Aucun propriétaire</div>
                            ) : (
                              ownersList.map((o) => (
                                <div key={o.user_uuid} style={{ fontSize: '12px', padding: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '4px' }} title={o.email}>
                                  {o.email.split('@')[0]}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Vendeurs ({vendeursList.length})
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {vendeursList.length === 0 ? (
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Aucun vendeur</div>
                            ) : (
                              vendeursList.map((v) => (
                                <div key={v.user_uuid} style={{ fontSize: '12px', padding: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '4px' }} title={v.user_uuid}>
                                  {users.find(u => u.uuid === v.user_uuid)?.email || v.user_uuid.substring(0, 8)}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Top Selling Products ranking */}
                      <div>
                        <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                          Produits les plus vendus
                        </h4>
                        <div className="data-table-wrapper" style={{ maxHeight: '180px', border: '1px solid var(--border)', borderRadius: '4px' }}>
                          <table className="data-table" style={{ fontSize: '12px' }}>
                            <thead>
                              <tr style={{ background: 'var(--bg-dark)' }}>
                                <th style={{ padding: '8px 12px' }}>Article</th>
                                <th style={{ padding: '8px 12px' }}>Quantité</th>
                                <th style={{ padding: '8px 12px' }}>Revenu</th>
                              </tr>
                            </thead>
                            <tbody>
                              {!fStats || !fStats.top_products || fStats.top_products.length === 0 ? (
                                <tr>
                                  <td colSpan={3} style={{ textAlign: 'center', padding: '12px', color: 'var(--text-secondary)' }}>
                                    Aucune vente
                                  </td>
                                </tr>
                              ) : (
                                fStats.top_products.map((p) => (
                                  <tr key={p.uuid}>
                                    <td style={{ padding: '8px 12px' }}>{p.name}</td>
                                    <td style={{ padding: '8px 12px' }}>{p.sales_count}</td>
                                    <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>
                                      {p.revenue.toLocaleString('fr-CD', { style: 'currency', currency: 'CDF' })}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Recent Sales log */}
                      <div>
                        <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                          Factures Récentes
                        </h4>
                        <div className="data-table-wrapper" style={{ maxHeight: '180px', border: '1px solid var(--border)', borderRadius: '4px' }}>
                          <table className="data-table" style={{ fontSize: '12px' }}>
                            <thead>
                              <tr style={{ background: 'var(--bg-dark)' }}>
                                <th style={{ padding: '8px 12px' }}>Facture</th>
                                <th style={{ padding: '8px 12px' }}>Vendeur</th>
                                <th style={{ padding: '8px 12px' }}>Détails des Articles</th>
                                <th style={{ padding: '8px 12px' }}>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {!fStats || !fStats.recent_sales || fStats.recent_sales.length === 0 ? (
                                <tr>
                                  <td colSpan={4} style={{ textAlign: 'center', padding: '12px', color: 'var(--text-secondary)' }}>
                                    Aucune facture récente
                                  </td>
                                </tr>
                              ) : (
                                getGroupedRecentSales(fStats.recent_sales).map((inv) => (
                                  <tr key={inv.facture_uuid}>
                                    <td style={{ padding: '8px 12px' }} className="table-uuid" title={inv.facture_uuid}>
                                      {inv.facture_uuid.substring(0, 8)}...
                                    </td>
                                    <td style={{ padding: '8px 12px' }}>{inv.vendeur_email.split('@')[0]}</td>
                                    <td style={{ padding: '8px 12px' }}>
                                      {inv.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                                    </td>
                                    <td style={{ padding: '8px 12px', fontWeight: 'bold', color: 'var(--success)' }}>
                                      {inv.total.toLocaleString('fr-CD', { style: 'currency', currency: 'CDF' })}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )
                })()
              )}
            </div>
          </div>
        </div>

        {/* TAB 3: USERS & ADMINS */}
        <div className={`tab-content ${activeTab === 'users' ? 'active' : ''} animate-fade-in`}>
          <div className="sections-grid">
            {/* Users List Column */}
            <div className="list-panel glass-panel">
              <div className="panel-header">
                <h3 className="card-title">Membres du Réseau</h3>
              </div>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Rôle Principal</th>
                      <th>UUID</th>
                      <th>Administrateur (Table Admins)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                          Aucun utilisateur enregistré dans le système.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const isSystemAdmin = adminsMap[u.uuid]
                        return (
                          <tr key={u.uuid}>
                            <td style={{ fontWeight: '500' }}>{u.email}</td>
                            <td>
                              <span className={`badge badge-${u.role}`}>{u.role}</span>
                            </td>
                            <td className="table-uuid">{u.uuid}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className={`badge ${isSystemAdmin ? 'badge-admin' : 'badge-secondary'}`}>
                                  {isSystemAdmin ? 'Actif' : 'Inactif'}
                                </span>
                                <button
                                  className="btn-secondary"
                                  style={{ padding: '4px 10px', fontSize: '11px' }}
                                  onClick={() => handleToggleAdminStatus(u)}
                                >
                                  {isSystemAdmin ? 'Révoquer' : 'Promouvoir'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Create User Form Column */}
            <div className="form-panel glass-panel">
              <h3 className="card-title" style={{ marginBottom: '20px' }}>
                Enregistrer un Membre
              </h3>
              <form onSubmit={handleCreateUser}>
                <div className="form-group">
                  <label htmlFor="user-email">Adresse Email</label>
                  <input
                    id="user-email"
                    type="email"
                    placeholder="nom@exemple.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="user-password">Mot de passe temporaire</label>
                  <input
                    id="user-password"
                    type="password"
                    placeholder="••••••••"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="user-role">Rôle Principal</label>
                  <select
                    id="user-role"
                    value={newUserRole}
                    onChange={(e) =>
                      setNewUserRole(e.target.value as 'admin' | 'franchise_owner' | 'vendeur')
                    }
                  >
                    <option value="admin">Administrateur (admin)</option>
                    <option value="franchise_owner">Propriétaire (franchise_owner)</option>
                    <option value="vendeur">Vendeur terrain (vendeur)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '10px' }}
                  disabled={creatingUser}
                >
                  {creatingUser ? (
                    <>
                      <div className="spinner" />
                      Hachage et Création...
                    </>
                  ) : (
                    'Enregistrer le membre'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Toast Notification Box */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === 'success' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
