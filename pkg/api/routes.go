package api

import "net/http"

func (api *API) Routes() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /admin/{uuid}", api.AdminController.NewUser)
	mux.HandleFunc("GET /admin/{uuid}", api.AdminController.GetUser)
	mux.HandleFunc("PATCH /admin/{uuid}", api.AdminController.UpdateUser)
	mux.HandleFunc("DELETE /admin/{uuid}", api.AdminController.DeleteUser)
	return mux
}
