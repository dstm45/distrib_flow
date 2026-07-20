package services

import (
	"context"

	"github.com/dstm45/template/pkg/database"
	"github.com/google/uuid"
)

type ProduitService interface {
	ListProduits(ctx context.Context) ([]database.Produit, error)
	CreateSale(ctx context.Context, vendeurUUID uuid.UUID, productUUIDs []uuid.UUID) (uuid.UUID, error)
	GetVendeurRecentSales(ctx context.Context, vendeurUUID uuid.UUID) ([]database.GetVendeurRecentSalesRow, error)
}

type produitService struct {
	DB *database.Queries
}

func NewProduitService(queries *database.Queries) ProduitService {
	return &produitService{DB: queries}
}

func (s *produitService) ListProduits(ctx context.Context) ([]database.Produit, error) {
	return s.DB.ListProduits(ctx)
}

func (s *produitService) CreateSale(ctx context.Context, vendeurUUID uuid.UUID, productUUIDs []uuid.UUID) (uuid.UUID, error) {
	// 1. Get vendeur details to find their franchise
	vendeur, err := s.DB.GetVendeurByUUID(ctx, vendeurUUID)
	if err != nil {
		return uuid.Nil, err
	}

	// 2. Create Facture
	factureUUID, err := s.DB.CreateFacture(ctx, nil)
	if err != nil {
		return uuid.Nil, err
	}

	// 3. Create Ventes for each product
	for _, pUUID := range productUUIDs {
		_, err := s.DB.CreateVente(ctx, database.CreateVenteParams{
			Column1:       nil,
			FactureUuid:   factureUUID,
			VendeurUuid:   vendeurUUID,
			FranchiseUuid: vendeur.FranchiseUuid,
			ProduitUuid:   pUUID,
		})
		if err != nil {
			return uuid.Nil, err
		}
	}

	return factureUUID, nil
}

func (s *produitService) GetVendeurRecentSales(ctx context.Context, vendeurUUID uuid.UUID) ([]database.GetVendeurRecentSalesRow, error) {
	return s.DB.GetVendeurRecentSales(ctx, vendeurUUID)
}
