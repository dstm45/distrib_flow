package controllers

import (
	"encoding/json"
	"net/http"

	"github.com/dstm45/template/pkg/middlewares"
	"github.com/dstm45/template/pkg/services"
	"github.com/google/uuid"
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
	idStr := r.PathValue("uuid")
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
	idStr := r.PathValue("uuid")
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

func (c *FranchiseController) ListByOwner(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userUUID, ok := ctx.Value(middlewares.UUIDKey).(uuid.UUID)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	franchises, err := c.Service.ListFranchisesByOwner(ctx, userUUID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(franchises)
}

func (c *FranchiseController) Stats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userUUID, ok := ctx.Value(middlewares.UUIDKey).(uuid.UUID)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	role, ok := ctx.Value(middlewares.RoleKey).(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	idStr := r.PathValue("uuid")
	franchiseUUID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid UUID", http.StatusBadRequest)
		return
	}

	// If user is not an admin, verify they own the requested franchise
	if role != "admin" {
		ownedFranchises, err := c.Service.ListFranchisesByOwner(ctx, userUUID)
		if err != nil {
			http.Error(w, "Error verifying franchise ownership", http.StatusInternalServerError)
			return
		}
		owned := false
		for _, f := range ownedFranchises {
			if f.Uuid == franchiseUUID {
				owned = true
				break
			}
		}
		if !owned {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
	}

	stats, err := c.Service.GetFranchiseStats(ctx, franchiseUUID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
