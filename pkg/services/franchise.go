package services

import (
	"context"

	"github.com/dstm45/template/pkg/database"
	"github.com/google/uuid"
)

type FranchiseService interface {
	CreateFranchise(ctx context.Context, uuid *uuid.UUID) (database.Franchise, error)
	GetFranchise(ctx context.Context, uuid uuid.UUID) (database.Franchise, error)
	ListFranchises(ctx context.Context) ([]database.Franchise, error)
	DeleteFranchise(ctx context.Context, uuid uuid.UUID) error
}

type franchiseService struct {
	DB *database.Queries
}

func NewFranchiseService(queries *database.Queries) FranchiseService {
	return &franchiseService{DB: queries}
}

func (s *franchiseService) CreateFranchise(ctx context.Context, id *uuid.UUID) (database.Franchise, error) {
	var dbID uuid.UUID
	if id != nil {
		dbID = *id
	}
	return s.DB.CreateFranchise(ctx, database.NullUuid{UUID: dbID, Valid: id != nil})
}

func (s *franchiseService) GetFranchise(ctx context.Context, id uuid.UUID) (database.Franchise, error) {
	return s.DB.GetFranchiseByUUID(ctx, id)
}

func (s *franchiseService) ListFranchises(ctx context.Context) ([]database.Franchise, error) {
	return s.DB.ListFranchises(ctx)
}

func (s *franchiseService) DeleteFranchise(ctx context.Context, id uuid.UUID) error {
	return s.DB.DeleteFranchise(ctx, id)
}
