import { useState, useEffect } from 'react';

interface Product {
  uuid: string;
  name: string;
  price: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface RecentSale {
  vente_uuid: string;
  produit_name: string;
  produit_price: number;
  facture_uuid: string;
}

interface VendeurPanelProps {
  currentUserEmail: string;
  handleLogout: () => Promise<void>;
  addToast: (text: string, type?: 'success' | 'error') => void;
}

export default function VendeurPanel({
  currentUserEmail,
  handleLogout,
  addToast
}: VendeurPanelProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load catalog and sales history on mount
  useEffect(() => {
    loadProducts();
    loadRecentSales();
  }, []);

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await fetch('/produits', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          throw new Error('Session expirée ou accès non autorisé.');
        }
        throw new Error('Impossible de charger les produits');
      }
      const data: Product[] = await res.json();
      setProducts(data || []);
    } catch (err: any) {
      addToast(err.message || 'Erreur lors du chargement des produits', 'error');
    } finally {
      setProductsLoading(false);
    }
  };

  const loadRecentSales = async () => {
    setLoading(true);
    try {
      const res = await fetch('/ventes/recent', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          return;
        }
        throw new Error('Impossible de charger l\'historique des ventes');
      }
      const data: RecentSale[] = await res.json();
      setRecentSales(data || []);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.uuid === product.uuid);
      if (existing) {
        return prev.map((item) =>
          item.product.uuid === product.uuid
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    addToast(`${product.name} ajouté au panier`, 'success');
  };

  const updateQuantity = (productUuid: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.uuid === productUuid) {
            const nextQty = item.quantity + delta;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const clearCart = () => {
    setCart([]);
    addToast('Panier vidé', 'success');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);

    // Expand cart items to list of duplicate UUIDs
    const productUuids: string[] = [];
    cart.forEach((item) => {
      for (let i = 0; i < item.quantity; i++) {
        productUuids.push(item.product.uuid);
      }
    });

    try {
      const res = await fetch('/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_uuids: productUuids }),
        credentials: 'include',
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Erreur lors de la validation de la vente');
      }

      addToast('Vente enregistrée avec succès !', 'success');
      setCart([]);
      loadRecentSales();
    } catch (err: any) {
      addToast(err.message || 'Erreur lors du paiement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getProductPrice = (product: Product): number => {
    return product.price;
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + getProductPrice(item.product) * item.quantity, 0);
  };

  interface GroupedInvoice {
    facture_uuid: string;
    items: {
      name: string;
      price: number;
      quantity: number;
    }[];
    total: number;
  }

  const getGroupedInvoices = (): GroupedInvoice[] => {
    const groups: Record<string, GroupedInvoice> = {};
    recentSales.forEach((sale) => {
      if (!groups[sale.facture_uuid]) {
        groups[sale.facture_uuid] = {
          facture_uuid: sale.facture_uuid,
          items: [],
          total: 0,
        };
      }
      const g = groups[sale.facture_uuid];
      const existingItem = g.items.find((it) => it.name === sale.produit_name);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        g.items.push({
          name: sale.produit_name,
          price: sale.produit_price,
          quantity: 1,
        });
      }
      g.total += sale.produit_price;
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
            Mode Vendeur
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '10px 12px', background: 'var(--primary-glow)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
            Terminal de Ventes Actif
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <span className="user-email" title={currentUserEmail}>{currentUserEmail}</span>
            <span className="user-role badge badge-vendeur" style={{ fontSize: '10px', padding: '2px 8px', marginTop: '4px' }}>
              Vendeur Terrain
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

      {/* Main POS Interface */}
      <main className="main-content">
        <header className="content-header">
          <div>
            <h1>Terminal de Caisse</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Sélectionnez des articles dans le catalogue, ajustez les quantités et validez pour enregistrer la vente.
            </p>
          </div>

          <button className="btn-secondary" onClick={() => { loadProducts(); loadRecentSales(); }} disabled={productsLoading || loading}>
            <svg
              className={productsLoading || loading ? 'spinner' : ''}
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

        <div className="sections-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
          {/* Left Column: Product Catalog */}
          <div>
            <div className="list-panel glass-panel" style={{ minHeight: '500px' }}>
              <div className="panel-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', marginBottom: '20px' }}>
                <h3 className="card-title">Catalogue Produits</h3>
              </div>

              {productsLoading ? (
                <div className="loading-container">
                  <div className="spinner spinner-large" />
                  <span>Chargement du catalogue...</span>
                </div>
              ) : products.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Aucun produit configuré dans le catalogue. Contactez un administrateur.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                  {products.map((p) => (
                    <div key={p.uuid} className="stat-card glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'transform 0.2s, box-shadow 0.2s', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={p.name}>
                          {p.name}
                        </span>
                        <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '16px' }}>
                          {formatCurrency(getProductPrice(p))}
                        </span>
                      </div>
                      <button
                        className="btn-primary"
                        onClick={() => addToCart(p)}
                        style={{ width: '100%', padding: '8px 10px', fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                      >
                        <span>Ajouter</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Cart & Recent Sales */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Cart Panel */}
            <div className="form-panel glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="panel-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title" style={{ margin: 0 }}>Mon Panier</h3>
                {cart.length > 0 && (
                  <button className="btn-secondary" onClick={clearCart} style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Vider
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic' }}>
                  Votre panier est vide.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                  {cart.map((item) => (
                    <div key={item.product.uuid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflow: 'hidden' }}>
                        <span style={{ fontWeight: '500', fontSize: '13px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {item.product.name}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                          {formatCurrency(getProductPrice(item.product))} / u
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            className="btn-secondary"
                            onClick={() => updateQuantity(item.product.uuid, -1)}
                            style={{ width: '24px', height: '24px', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 'auto', borderRadius: '4px' }}
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center', fontSize: '14px' }}>
                            {item.quantity}
                          </span>
                          <button
                            className="btn-secondary"
                            onClick={() => updateQuantity(item.product.uuid, 1)}
                            style={{ width: '24px', height: '24px', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 'auto', borderRadius: '4px' }}
                          >
                            +
                          </button>
                        </div>
                        <span style={{ fontWeight: '600', minWidth: '60px', textAlign: 'right', fontSize: '13px' }}>
                          {formatCurrency(getProductPrice(item.product) * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Total de la Vente</span>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {formatCurrency(getCartTotal())}
                  </span>
                </div>
                <button
                  className="btn-primary"
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || submitting}
                  style={{ width: '100%', padding: '12px', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  {submitting ? (
                    <>
                      <div className="spinner" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <span>Enregistrer la Vente</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Recent Sales Panel */}
            <div className="list-panel glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="panel-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                <h3 className="card-title">Factures Récentes</h3>
              </div>

              <div className="data-table-wrapper" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Facture</th>
                      <th>Détails des Articles</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getGroupedInvoices().length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                          Aucune facture enregistrée aujourd'hui.
                        </td>
                      </tr>
                    ) : (
                      getGroupedInvoices().map((inv) => (
                        <tr key={inv.facture_uuid}>
                          <td className="table-uuid" style={{ fontSize: '11px' }} title={inv.facture_uuid}>
                            {inv.facture_uuid.substring(0, 8)}...
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
      </main>
    </div>
  );
}
