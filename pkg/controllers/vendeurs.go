package controllers

import (
	"encoding/json"
	"net/http"

	"github.com/dstm45/template/pkg/services"
	"github.com/google/uuid"
)

type VendeurController struct {
	Service services.VendeurService
}

func NewVendeurController(svc services.VendeurService) *VendeurController {
	return &VendeurController{Service: svc}
}

type vendeurRequest struct {
	UserID       uuid.UUID `json:"user_id"`
	FranchiseID uuid.UUID `json:"franchise_id"`
}

func (c *VendeurController) Create(w http.ResponseWriter, r *http.Request) {
	var req vendeurRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	vendeur, err := c.Service.CreateVendeur(r.Context(), req.UserID, req.FranchiseID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vendeur)
}

func (c *VendeurController) Get(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("user_uuid")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid User UUID", http.StatusBadRequest)
		return
	}
	vendeur, err := c.Service.GetVendeur(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(vendeur)
}

func (c *VendeurController) ListByFranchise(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("franchise_uuid")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid Franchise UUID", http.StatusBadRequest)
		return
	}
	vendeurs, err := c.Service.ListVendeursByFranchise(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(vendeurs)
}

func (c *VendeurController) Update(w http.ResponseWriter, r *http.Request) {
	userID, err := uuid.Parse(r.PathValue("user_uuid"))
	if err != nil {
		http.Error(w, "Invalid User UUID", http.StatusBadRequest)
		return
	}
	var req struct {
		FranchiseID uuid.UUID `json:"franchise_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	vendeur, err := c.Service.UpdateVendeurFranchise(r.Context(), userID, req.FranchiseID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(vendeur)
}

func (c *VendeurController) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("user_uuid")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid User UUID", http.StatusBadRequest)
		return
	}
	if err := c.Service.DeleteVendeur(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
