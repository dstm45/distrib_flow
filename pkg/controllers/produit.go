package controllers

import (
	"encoding/json"
	"net/http"

	"github.com/dstm45/template/pkg/middlewares"
	"github.com/dstm45/template/pkg/services"
	"github.com/google/uuid"
)

type ProduitController struct {
	Service services.ProduitService
}

func NewProduitController(svc services.ProduitService) *ProduitController {
	return &ProduitController{Service: svc}
}

func (c *ProduitController) List(w http.ResponseWriter, r *http.Request) {
	produits, err := c.Service.ListProduits(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(produits)
}

type createSaleRequest struct {
	ProductUUIDs []uuid.UUID `json:"product_uuids"`
}

func (c *ProduitController) CreateVente(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vendeurUUID, ok := ctx.Value(middlewares.UUIDKey).(uuid.UUID)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	role, ok := ctx.Value(middlewares.RoleKey).(string)
	if !ok || role != "vendeur" {
		http.Error(w, "Forbidden: Only vendeurs can make sales", http.StatusForbidden)
		return
	}

	var req createSaleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if len(req.ProductUUIDs) == 0 {
		http.Error(w, "At least one product must be selected", http.StatusBadRequest)
		return
	}

	factureUUID, err := c.Service.CreateSale(ctx, vendeurUUID, req.ProductUUIDs)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]any{
		"facture_uuid": factureUUID,
		"message":      "Sale recorded successfully",
	})
}

func (c *ProduitController) RecentSales(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vendeurUUID, ok := ctx.Value(middlewares.UUIDKey).(uuid.UUID)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	role, ok := ctx.Value(middlewares.RoleKey).(string)
	if !ok || role != "vendeur" {
		http.Error(w, "Forbidden: Only vendeurs can view recent sales", http.StatusForbidden)
		return
	}

	sales, err := c.Service.GetVendeurRecentSales(ctx, vendeurUUID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sales)
}
