import { useState, useEffect } from 'react';

interface Franchise {
  uuid: string;
  created_at: string;
}

interface OwnerDetail {
  user_uuid: string;
  email: string;
}

interface ProductStat {
  uuid: string;
  name: string;
  price: number;
  sales_count: number;
  revenue: number;
}

interface VendeurStat {
  uuid: string;
  email: string;
  sales_count: number;
  revenue: number;
}

interface VenteDetail {
  uuid: string;
  facture_uuid: string;
  vendeur_email: string;
  product_name: string;
  price: number;
}

interface FranchiseStats {
  franchise_uuid: string;
  created_at: string;
  total_revenue: number;
  total_sales: number;
  total_sellers: number;
  top_products: ProductStat[];
  top_sellers: VendeurStat[];
  recent_sales: VenteDetail[];
}

interface FranchiseOwnerPanelProps {
  currentUserEmail: string;
  handleLogout: () => Promise<void>;
  addToast: (text: string, type?: 'success' | 'error') => void;
}

export default function FranchiseOwnerPanel({
  currentUserEmail,
  handleLogout,
  addToast
}: FranchiseOwnerPanelProps) {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [selectedFranchiseUuid, setSelectedFranchiseUuid] = useState<string>('');
  const [stats, setStats] = useState<FranchiseStats | null>(null);
  const [owners, setOwners] = useState<OwnerDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [franchisesLoading, setFranchisesLoading] = useState(false);

  // Load owned franchises on mount
  useEffect(() => {
    loadFranchises();
  }, []);

  // Load stats and owners when selected franchise changes
  useEffect(() => {
    if (selectedFranchiseUuid) {
      loadStats(selectedFranchiseUuid);
      loadOwners(selectedFranchiseUuid);
    } else {
      setStats(null);
      setOwners([]);
    }
  }, [selectedFranchiseUuid]);

  const loadFranchises = async () => {
    setFranchisesLoading(true);
    try {
      const res = await fetch('/my-franchises', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          throw new Error('Session expirée ou accès non autorisé.');
        }
        throw new Error('Impossible de charger vos franchises');
      }
      const data: Franchise[] = await res.json();
      setFranchises(data || []);
      if (data && data.length > 0) {
        setSelectedFranchiseUuid(data[0].uuid);
      }
    } catch (err: any) {
      addToast(err.message || 'Erreur lors du chargement des franchises', 'error');
    } finally {
      setFranchisesLoading(false);
    }
  };

  const loadStats = async (franchiseUuid: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/franchises/${franchiseUuid}/stats`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          throw new Error('Session expirée ou accès non autorisé.');
        }
        throw new Error('Impossible de charger les statistiques de la franchise');
      }
      const data: FranchiseStats = await res.json();
      setStats(data);
    } catch (err: any) {
      addToast(err.message || 'Erreur de chargement des statistiques', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadOwners = async (franchiseUuid: string) => {
    try {
      const res = await fetch(`/franchises/${franchiseUuid}/owners`, { credentials: 'include' });
      if (res.ok) {
        const data: OwnerDetail[] = await res.json();
        setOwners(data || []);
      }
    } catch (e) {
      console.error('Error loading owners', e);
    }
  };

  const handleRefresh = () => {
    if (selectedFranchiseUuid) {
      loadStats(selectedFranchiseUuid);
      loadOwners(selectedFranchiseUuid);
    } else {
      loadFranchises();
    }
    addToast('Données actualisées', 'success');
  };

  const getGroupedRecentSales = (sales: VenteDetail[]) => {
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

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-CD', { style: 'currency', currency: 'CDF' });
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">DistribFlow</div>
        <div style={{ padding: '0 16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            Mes Franchises
          </div>
          {franchisesLoading ? (
            <div className="spinner" style={{ margin: '10px 0' }} />
          ) : franchises.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Aucune franchise
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {franchises.map((f) => (
                <button
                  key={f.uuid}
                  onClick={() => setSelectedFranchiseUuid(f.uuid)}
                  className={`menu-item ${selectedFranchiseUuid === f.uuid ? 'active' : ''}`}
                  style={{
                    padding: '10px 12px',
                    fontSize: '13px',
                    textAlign: 'left',
                    width: '100%',
                    justifyContent: 'flex-start',
                    borderRadius: '8px',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    display: 'block'
                  }}
                  title={f.uuid}
                >
                  Franchise: {f.uuid.substring(0, 8)}...
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Franchise Owners */}
        {selectedFranchiseUuid && owners.length > 0 && (
          <div style={{ padding: '0 16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Propriétaires associés
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {owners.map((o) => (
                <div key={o.user_uuid} style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', padding: '6px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
                  <span style={{ fontWeight: '500', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={o.email}>
                    {o.email} {o.email === currentUserEmail && '(Vous)'}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    ID: {o.user_uuid.substring(0, 8)}...
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="sidebar-footer">
          <div className="user-profile">
            <span className="user-email" title={currentUserEmail}>{currentUserEmail}</span>
            <span className="user-role badge badge-owner" style={{ fontSize: '10px', padding: '2px 8px', marginTop: '4px' }}>
              Propriétaire
            </span>
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
            <h1>Dashboard Franchise</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {selectedFranchiseUuid ? `Consultez les indicateurs clés et performances pour la franchise : ${selectedFranchiseUuid}` : 'Sélectionnez une franchise dans le menu latéral'}
            </p>
          </div>

          <button className="btn-secondary" onClick={handleRefresh} disabled={loading || franchisesLoading}>
            <svg
              className={loading ? 'spinner' : ''}
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

        {loading && !stats && (
          <div className="loading-container glass-panel">
            <div className="spinner spinner-large" />
            <span>Chargement des données de votre franchise...</span>
          </div>
        )}

        {!selectedFranchiseUuid && !franchisesLoading && (
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Vous n'avez pas de franchise assignée ou sélectionnée. Contactez un administrateur pour lier une franchise à votre compte.
          </div>
        )}

        {selectedFranchiseUuid && stats && (
          <div className="animate-fade-in">
            {/* KPI Summary Cards */}
            <div className="stats-grid" style={{ marginBottom: '30px' }}>
              <div className="stat-card glass-panel" style={{ borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="stat-title">Chiffre d'Affaires</div>
                  <div style={{ background: 'var(--primary-glow)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                  </div>
                </div>
                <div className="stat-value" style={{ marginTop: '10px' }}>
                  {formatCurrency(stats.total_revenue)}
                </div>
              </div>

              <div className="stat-card glass-panel" style={{ borderLeft: '4px solid var(--secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="stat-title">Ventes Réalisées</div>
                  <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                  </div>
                </div>
                <div className="stat-value" style={{ marginTop: '10px' }}>
                  {stats.total_sales}
                </div>
              </div>

              <div className="stat-card glass-panel" style={{ borderLeft: '4px solid var(--success)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="stat-title">Vendeurs Terrain</div>
                  <div style={{ background: 'var(--success-glow)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                </div>
                <div className="stat-value" style={{ marginTop: '10px' }}>
                  {stats.total_sellers}
                </div>
              </div>
            </div>

            {/* Detailed tables section */}
            <div className="sections-grid">
              {/* Left Column: Top Sellers & Products */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Top Products */}
                <div className="list-panel glass-panel">
                  <div className="panel-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    <h3 className="card-title">Produits les plus vendus</h3>
                  </div>
                  <div className="data-table-wrapper" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Nom du Produit</th>
                          <th>Prix Unitaire</th>
                          <th>Quantité</th>
                          <th>Chiffre d'Affaires</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.top_products.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                              Aucun produit vendu pour l'instant
                            </td>
                          </tr>
                        ) : (
                          stats.top_products.map((p) => (
                            <tr key={p.uuid}>
                              <td style={{ fontWeight: '500' }}>{p.name}</td>
                              <td>{formatCurrency(p.price)}</td>
                              <td>
                                <span className="badge badge-vendeur" style={{ padding: '2px 8px' }}>{p.sales_count}</span>
                              </td>
                              <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{formatCurrency(p.revenue)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Sellers */}
                <div className="list-panel glass-panel">
                  <div className="panel-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    <h3 className="card-title">Classement des Vendeurs</h3>
                  </div>
                  <div className="data-table-wrapper" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Vendeur Email</th>
                          <th>Nombre de Ventes</th>
                          <th>Chiffre d'Affaires</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.top_sellers.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                              Aucun vendeur actif trouvé
                            </td>
                          </tr>
                        ) : (
                          stats.top_sellers.map((s) => (
                            <tr key={s.uuid}>
                              <td style={{ fontWeight: '500' }} title={s.email}>{s.email}</td>
                              <td>
                                <span className="badge badge-owner" style={{ padding: '2px 8px' }}>{s.sales_count}</span>
                              </td>
                              <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{formatCurrency(s.revenue)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column: Recent Sales */}
              <div className="list-panel glass-panel">
                <div className="panel-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  <h3 className="card-title">Historique des Factures Récentes</h3>
                </div>
                <div className="data-table-wrapper" style={{ maxHeight: '630px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Facture</th>
                        <th>Vendeur</th>
                        <th>Détails des Articles</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getGroupedRecentSales(stats.recent_sales).length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                            Aucune facture enregistrée récemment
                          </td>
                        </tr>
                      ) : (
                        getGroupedRecentSales(stats.recent_sales).map((inv) => (
                          <tr key={inv.facture_uuid}>
                            <td className="table-uuid" style={{ fontSize: '11px' }} title={inv.facture_uuid}>
                              {inv.facture_uuid.substring(0, 8)}...
                            </td>
                            <td style={{ fontSize: '13px' }} title={inv.vendeur_email}>
                              {inv.vendeur_email.split('@')[0]}
                            </td>
                            <td style={{ fontSize: '13px' }}>
                              {inv.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                            </td>
                            <td style={{ fontWeight: '600', color: 'var(--success)' }}>
                              {formatCurrency(inv.total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
