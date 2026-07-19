package controllers

import (
	"encoding/json"
	"net/http"

	"github.com/dstm45/template/pkg/services"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type FranchiseOwnerController struct {
	Service services.FranchiseOwnerService
}

func NewFranchiseOwnerController(svc services.FranchiseOwnerService) *FranchiseOwnerController {
	return &FranchiseOwnerController{Service: svc}
}

type ownerRequest struct {
	UserID uuid.UUID `json:"user_id"`
}

func (c *FranchiseOwnerController) AddOwner(w http.ResponseWriter, r *http.Request) {
	franchiseID, err := uuid.Parse(mux.Vars(r)["franchise_uuid"])
	if err != nil {
		http.Error(w, "Invalid Franchise UUID", http.StatusBadRequest)
		return
	}
	var req ownerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := c.Service.AddOwner(r.Context(), req.UserID, franchiseID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (c *FranchiseOwnerController) GetOwners(w http.ResponseWriter, r *http.Request) {
	franchiseID, err := uuid.Parse(mux.Vars(r)["franchise_uuid"])
	if err != nil {
		http.Error(w, "Invalid Franchise UUID", http.StatusBadRequest)
		return
	}
	owners, err := c.Service.GetOwnersByFranchise(r.Context(), franchiseID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(owners)
}

func (c *FranchiseOwnerController) RemoveOwner(w http.ResponseWriter, r *http.Request) {
	franchiseID, err := uuid.Parse(mux.Vars(r)["franchise_uuid"])
	if err != nil {
		http.Error(w, "Invalid Franchise UUID", http.StatusBadRequest)
		return
	}
	userID, err := uuid.Parse(mux.Vars(r)["user_uuid"])
	if err != nil {
		http.Error(w, "Invalid User UUID", http.StatusBadRequest)
		return
	}
	if err := c.Service.RemoveOwner(r.Context(), userID, franchiseID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
