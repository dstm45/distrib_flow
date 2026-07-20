package controllers

import (
	"encoding/json"
	"net/http"

	"github.com/dstm45/template/pkg/database"
	"github.com/dstm45/template/pkg/services"
	"github.com/google/uuid"
)

type AdminController struct {
	AdminService services.AdminService
}

func NewAdminController(svc services.AdminService) *AdminController {
	return &AdminController{
		AdminService: svc,
	}
}

type newUserRequest struct {
	Email        string        `json:"email"`
	PasswordHash string        `json:"password_hash"`
	Role         database.Role `json:"role"`
}

func (c *AdminController) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req newUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	user, err := c.AdminService.NewUser(r.Context(), req.Email, req.PasswordHash, req.Role)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (c *AdminController) GetUser(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("uuid")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid UUID", http.StatusBadRequest)
		return
	}
	userData, err := c.AdminService.GetUserDataByUUID(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(userData)
}

func (c *AdminController) ListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := c.AdminService.ListUsers(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

type createAdminRequest struct {
	UserID uuid.UUID `json:"user_id"`
}

func (c *AdminController) CreateAdmin(w http.ResponseWriter, r *http.Request) {
	var req createAdminRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := c.AdminService.CreateAdmin(r.Context(), req.UserID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (c *AdminController) GetAdmin(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("user_uuid")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid UUID", http.StatusBadRequest)
		return
	}
	admin, err := c.AdminService.GetAdmin(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(admin)
}

func (c *AdminController) DeleteAdmin(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("user_uuid")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid UUID", http.StatusBadRequest)
		return
	}
	if err := c.AdminService.DeleteAdmin(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
