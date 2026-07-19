package controllers

import (
	"encoding/json"
	"net/http"

	"github.com/dstm45/template/pkg/services"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type FranchiseController struct {
	Service services.FranchiseService
}

func NewFranchiseController(svc services.FranchiseService) *FranchiseController {
	return &FranchiseController{Service: svc}
}

func (c *FranchiseController) Create(w http.ResponseWriter, r *http.Request) {
	franchise, err := c.Service.CreateFranchise(r.Context(), nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(franchise)
}

func (c *FranchiseController) Get(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["uuid"]
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid UUID", http.StatusBadRequest)
		return
	}
	franchise, err := c.Service.GetFranchise(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(franchise)
}

func (c *FranchiseController) List(w http.ResponseWriter, r *http.Request) {
	franchises, err := c.Service.ListFranchises(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(franchises)
}

func (c *FranchiseController) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["uuid"]
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid UUID", http.StatusBadRequest)
		return
	}
	if err := c.Service.DeleteFranchise(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
