package services

import (
	"context"

	"github.com/dstm45/template/pkg/database"
	"github.com/google/uuid"
)

type VendeurService interface {
	CreateVendeur(ctx context.Context, userID, franchiseID uuid.UUID) (database.Vendeur, error)
	GetVendeur(ctx context.Context, userID uuid.UUID) (database.Vendeur, error)
	ListVendeursByFranchise(ctx context.Context, franchiseID uuid.UUID) ([]database.Vendeur, error)
	UpdateVendeurFranchise(ctx context.Context, userID, franchiseID uuid.UUID) (database.Vendeur, error)
	DeleteVendeur(ctx context.Context, userID uuid.UUID) error
}

type vendeurService struct {
	DB *database.Queries
}

func NewVendeurService(queries *database.Queries) VendeurService {
	return &vendeurService{DB: queries}
}

func (s *vendeurService) CreateVendeur(ctx context.Context, userID, franchiseID uuid.UUID) (database.Vendeur, error) {
	return s.DB.CreateVendeur(ctx, database.CreateVendeurParams{
		UserUuid:      userID,
		FranchiseUuid: franchiseID,
	})
}

func (s *vendeurService) GetVendeur(ctx context.Context, userID uuid.UUID) (database.Vendeur, error) {
	return s.DB.GetVendeurByUUID(ctx, userID)
}

func (s *vendeurService) ListVendeursByFranchise(ctx context.Context, franchiseID uuid.UUID) ([]database.Vendeur, error) {
	return s.DB.ListVendeursByFranchise(ctx, franchiseID)
}

func (s *vendeurService) UpdateVendeurFranchise(ctx context.Context, userID, franchiseID uuid.UUID) (database.Vendeur, error) {
	return s.DB.UpdateVendeurFranchise(ctx, database.UpdateVendeurFranchiseParams{
		UserUuid:      userID,
		FranchiseUuid: franchiseID,
	})
}

func (s *vendeurService) DeleteVendeur(ctx context.Context, userID uuid.UUID) error {
	return s.DB.DeleteVendeur(ctx, userID)
}
