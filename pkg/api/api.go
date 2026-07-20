package api

import (
	"github.com/dstm45/template/pkg/controllers"
	"github.com/dstm45/template/pkg/database"
	"github.com/dstm45/template/pkg/services"
)

type API struct {
	AdminController          *controllers.AdminController
	FranchiseController      *controllers.FranchiseController
	FranchiseOwnerController *controllers.FranchiseOwnerController
	VendeurController        *controllers.VendeurController
	AuthController           *controllers.AuthController
	ProduitController        *controllers.ProduitController
}

type Services struct {
	AdminService          services.AdminService
	FranchiseService      services.FranchiseService
	FranchiseOwnerService services.FranchiseOwnerService
	VendeurService        services.VendeurService
	AuthService           services.AuthService
	ProduitService        services.ProduitService
}

func InitializeServices(queries *database.Queries) *Services {
	return &Services{
		AdminService:          services.NewAdminService(queries),
		FranchiseService:      services.NewFranchiseService(queries),
		FranchiseOwnerService: services.NewFranchiseOwnerService(queries),
		VendeurService:        services.NewVendeurService(queries),
		AuthService:           services.NewAuthService(queries),
		ProduitService:        services.NewProduitService(queries),
	}
}

func NewAPI(svc *Services) *API {
	return &API{
		AdminController:          controllers.NewAdminController(svc.AdminService),
		FranchiseController:      controllers.NewFranchiseController(svc.FranchiseService),
		FranchiseOwnerController: controllers.NewFranchiseOwnerController(svc.FranchiseOwnerService),
		VendeurController:        controllers.NewVendeurController(svc.VendeurService),
		AuthController:           controllers.NewAuthController(svc.AuthService),
		ProduitController:        controllers.NewProduitController(svc.ProduitService),
	}
}
