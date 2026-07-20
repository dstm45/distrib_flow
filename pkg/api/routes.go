package api

import (
	"net/http"

	"github.com/dstm45/template/pkg/middlewares"
)

func (api *API) Routes() *http.ServeMux {
	mux := http.NewServeMux()

	// Admin Routes
	mux.HandleFunc("POST /admin/users", middlewares.IsAdminMiddleware(api.AdminController.CreateUser, api.AuthController.S))
	mux.HandleFunc("GET /admin/users", middlewares.IsAdminMiddleware(api.AdminController.ListUsers, api.AuthController.S))
	mux.HandleFunc("GET /admin/users/{uuid}", middlewares.IsAdminMiddleware(api.AdminController.GetUser, api.AuthController.S))
	mux.HandleFunc("POST /admin/admins", middlewares.IsAdminMiddleware(api.AdminController.CreateAdmin, api.AuthController.S))
	mux.HandleFunc("GET /admin/admins/{user_uuid}", middlewares.IsAdminMiddleware(api.AdminController.GetAdmin, api.AuthController.S))
	mux.HandleFunc("DELETE /admin/admins/{user_uuid}", middlewares.IsAdminMiddleware(api.AdminController.DeleteAdmin, api.AuthController.S))

	// Franchise Routes
	mux.HandleFunc("POST /franchises", api.FranchiseController.Create)
	mux.HandleFunc("GET /franchises/{uuid}", api.FranchiseController.Get)
	mux.HandleFunc("GET /franchises", api.FranchiseController.List)
	mux.HandleFunc("DELETE /franchises/{uuid}", api.FranchiseController.Delete)
	mux.HandleFunc("GET /my-franchises", middlewares.AuthMiddleware(api.FranchiseController.ListByOwner, api.AuthController.S))
	mux.HandleFunc("GET /franchises/{uuid}/stats", middlewares.AuthMiddleware(api.FranchiseController.Stats, api.AuthController.S))

	// Franchise Owner Routes
	mux.HandleFunc("POST /franchises/{franchise_uuid}/owners", api.FranchiseOwnerController.AddOwner)
	mux.HandleFunc("GET /franchises/{franchise_uuid}/owners", api.FranchiseOwnerController.GetOwners)
	mux.HandleFunc("DELETE /franchises/{franchise_uuid}/owners/{user_uuid}", api.FranchiseOwnerController.RemoveOwner)

	// Vendeur Routes
	mux.HandleFunc("POST /vendeurs", api.VendeurController.Create)
	mux.HandleFunc("GET /vendeurs/{user_uuid}", api.VendeurController.Get)
	mux.HandleFunc("GET /franchises/{franchise_uuid}/vendeurs", api.VendeurController.ListByFranchise)
	mux.HandleFunc("PATCH /vendeurs/{user_uuid}", api.VendeurController.Update)
	mux.HandleFunc("DELETE /vendeurs/{user_uuid}", api.VendeurController.Delete)

	// Produit & Vente Routes
	mux.HandleFunc("GET /produits", middlewares.AuthMiddleware(api.ProduitController.List, api.AuthController.S))
	mux.HandleFunc("POST /ventes", middlewares.AuthMiddleware(api.ProduitController.CreateVente, api.AuthController.S))
	mux.HandleFunc("GET /ventes/recent", middlewares.AuthMiddleware(api.ProduitController.RecentSales, api.AuthController.S))

	// Auth Routes
	mux.HandleFunc("POST /auth/signin", api.AuthController.Signin)
	mux.HandleFunc("POST /auth/refresh", api.AuthController.RefreshToken)
	mux.HandleFunc("POST /auth/logout", api.AuthController.Logout)
	mux.HandleFunc("GET /auth/me", middlewares.AuthMiddleware(api.AuthController.Me, api.AuthController.S))

	return mux
}
