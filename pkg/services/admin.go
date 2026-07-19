package services

import (
	"context"

	"github.com/dstm45/template/pkg/database"
)

type AdminService interface {
	CreateUser(ctx context.Context) error
	GetUser(ctx context.Context) error
	DeleteUser(ctx context.Context) error
	UpdateUser(ctx context.Context) error
}

type adminService struct {
	DB *database.Queries
}

func NewAdminService(queries *database.Queries) *adminService {
	return &adminService{
		DB: queries,
	}
}

func (svc *adminService) CreateUser(ctx context.Context) error { return nil }
func (svc *adminService) GetUser(ctx context.Context) error    { return nil }
func (svc *adminService) DeleteUser(ctx context.Context) error { return nil }
func (svc *adminService) UpdateUser(ctx context.Context) error { return nil }
