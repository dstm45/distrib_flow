package services

import (
	"context"

	"github.com/dstm45/template/pkg/database"
	"github.com/google/uuid"
)

type AdminService interface {
	// User management
	NewUser(ctx context.Context, email, passwordHash string, role database.Role) (database.User, error)
	GetUserByEmail(ctx context.Context, email string) (database.GetUserByEmailRow, error)
	GetUserDataByUUID(ctx context.Context, uuid uuid.UUID) (database.UserPublicDatum, error)
	ListUsers(ctx context.Context) ([]database.UserPublicDatum, error)

	// Admin role management
	CreateAdmin(ctx context.Context, userID uuid.UUID) error
	GetAdmin(ctx context.Context, userID uuid.UUID) (uuid.UUID, error)
	DeleteAdmin(ctx context.Context, userID uuid.UUID) error
}

type adminService struct {
	DB *database.Queries
}

func NewAdminService(queries *database.Queries) AdminService {
	return &adminService{
		DB: queries,
	}
}

func (s *adminService) NewUser(ctx context.Context, email, passwordHash string, role database.Role) (database.User, error) {
	return s.DB.NewUser(ctx, database.NewUserParams{
		Email:        email,
		PasswordHash: passwordHash,
		Role:         role,
	})
}

func (s *adminService) GetUserByEmail(ctx context.Context, email string) (database.GetUserByEmailRow, error) {
	return s.DB.GetUserByEmail(ctx, email)
}

func (s *adminService) GetUserDataByUUID(ctx context.Context, uuid uuid.UUID) (database.UserPublicDatum, error) {
	return s.DB.GetUserDataByUUID(ctx, uuid)
}

func (s *adminService) ListUsers(ctx context.Context) ([]database.UserPublicDatum, error) {
	return s.DB.ListUsers(ctx)
}

func (s *adminService) CreateAdmin(ctx context.Context, userID uuid.UUID) error {
	return s.DB.CreateAdmin(ctx, userID)
}

func (s *adminService) GetAdmin(ctx context.Context, userID uuid.UUID) (uuid.UUID, error) {
	return s.DB.GetAdminByUUID(ctx, userID)
}

func (s *adminService) DeleteAdmin(ctx context.Context, userID uuid.UUID) error {
	return s.DB.DeleteAdmin(ctx, userID)
}
