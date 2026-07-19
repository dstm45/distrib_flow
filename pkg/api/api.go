package api

import (
	"github.com/dstm45/template/pkg/controllers"
	"github.com/dstm45/template/pkg/database"
	"github.com/dstm45/template/pkg/services"
)

type API struct {
	AdminController *controllers.AdminController
}

type Services struct {
	AdminService services.AdminService
}

func InitializeServices(queries *database.Queries) *Services {
	userService := services.NewAdminService(queries)
	return &Services{
		AdminService: userService,
	}
}

func NewAPI(svc *Services) *API {
	UserController := controllers.NewAdminController(svc.AdminService)
	return &API{
		AdminController: UserController,
	}
}
