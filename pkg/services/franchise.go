package services

import (
	"context"
	"time"

	"github.com/dstm45/template/pkg/database"
	"github.com/google/uuid"
)

type ProductStat struct {
	UUID       uuid.UUID `json:"uuid"`
	Name       string    `json:"name"`
	Price      float64   `json:"price"`
	SalesCount int64     `json:"sales_count"`
	Revenue    float64   `json:"revenue"`
}

type VendeurStat struct {
	UUID       uuid.UUID `json:"uuid"`
	Email      string    `json:"email"`
	SalesCount int64     `json:"sales_count"`
	Revenue    float64   `json:"revenue"`
}

type VenteDetail struct {
	UUID         uuid.UUID `json:"uuid"`
	FactureUUID  uuid.UUID `json:"facture_uuid"`
	VendeurEmail string    `json:"vendeur_email"`
	ProductName  string    `json:"product_name"`
	Price        float64   `json:"price"`
}

type FranchiseStatsResponse struct {
	FranchiseUUID uuid.UUID       `json:"franchise_uuid"`
	CreatedAt     time.Time       `json:"created_at"`
	TotalRevenue  float64         `json:"total_revenue"`
	TotalSales    int64           `json:"total_sales"`
	TotalSellers  int64           `json:"total_sellers"`
	TopProducts   []ProductStat   `json:"top_products"`
	TopSellers    []VendeurStat   `json:"top_sellers"`
	RecentSales   []VenteDetail   `json:"recent_sales"`
}

type FranchiseService interface {
	CreateFranchise(ctx context.Context, uuid *uuid.UUID) (database.Franchise, error)
	GetFranchise(ctx context.Context, uuid uuid.UUID) (database.Franchise, error)
	ListFranchises(ctx context.Context) ([]database.Franchise, error)
	DeleteFranchise(ctx context.Context, uuid uuid.UUID) error
	ListFranchisesByOwner(ctx context.Context, ownerUUID uuid.UUID) ([]database.Franchise, error)
	GetFranchiseStats(ctx context.Context, franchiseUUID uuid.UUID) (FranchiseStatsResponse, error)
}

type franchiseService struct {
	DB *database.Queries
}

func NewFranchiseService(queries *database.Queries) FranchiseService {
	return &franchiseService{DB: queries}
}

func (s *franchiseService) CreateFranchise(ctx context.Context, id *uuid.UUID) (database.Franchise, error) {
	return s.DB.CreateFranchise(ctx)
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

func (s *franchiseService) ListFranchisesByOwner(ctx context.Context, ownerUUID uuid.UUID) ([]database.Franchise, error) {
	return s.DB.GetFranchisesByOwner(ctx, ownerUUID)
}

func (s *franchiseService) GetFranchiseStats(ctx context.Context, franchiseUUID uuid.UUID) (FranchiseStatsResponse, error) {
	var stats FranchiseStatsResponse
	stats.FranchiseUUID = franchiseUUID

	// 1. Get Franchise
	franchise, err := s.DB.GetFranchiseByUUID(ctx, franchiseUUID)
	if err != nil {
		return stats, err
	}
	stats.CreatedAt = franchise.CreatedAt.Time

	// 2. Get Sales Summary
	summary, err := s.DB.GetFranchiseSalesSummary(ctx, franchiseUUID)
	if err == nil {
		stats.TotalSales = summary.TotalSales
		stats.TotalRevenue = summary.TotalRevenue
	}

	// 3. Get Sellers Count
	sellersCount, err := s.DB.GetFranchiseSellersCount(ctx, franchiseUUID)
	if err == nil {
		stats.TotalSellers = sellersCount
	}

	// 4. Get Top Products
	topProds, err := s.DB.GetFranchiseTopProducts(ctx, database.GetFranchiseTopProductsParams{
		FranchiseUuid: franchiseUUID,
		Limit:         5,
	})
	if err == nil {
		stats.TopProducts = make([]ProductStat, 0, len(topProds))
		for _, tp := range topProds {
			var priceVal float64
			if tp.Price.Valid {
				priceVal = tp.Price.Float64
			}
			stats.TopProducts = append(stats.TopProducts, ProductStat{
				UUID:       tp.Uuid,
				Name:       tp.Name,
				Price:      priceVal,
				SalesCount: tp.SalesCount,
				Revenue:    tp.Revenue,
			})
		}
	}

	// 5. Get Top Sellers
	topSellers, err := s.DB.GetFranchiseTopSellers(ctx, franchiseUUID)
	if err == nil {
		stats.TopSellers = make([]VendeurStat, 0, len(topSellers))
		for _, ts := range topSellers {
			stats.TopSellers = append(stats.TopSellers, VendeurStat{
				UUID:       ts.Uuid,
				Email:      ts.Email,
				SalesCount: ts.SalesCount,
				Revenue:    ts.Revenue,
			})
		}
	}

	// 6. Get Recent Sales
	recentSales, err := s.DB.GetFranchiseRecentSales(ctx, database.GetFranchiseRecentSalesParams{
		FranchiseUuid: franchiseUUID,
		Limit:         10,
	})
	if err == nil {
		stats.RecentSales = make([]VenteDetail, 0, len(recentSales))
		for _, rs := range recentSales {
			var priceVal float64
			if rs.ProduitPrice.Valid {
				priceVal = rs.ProduitPrice.Float64
			}
			stats.RecentSales = append(stats.RecentSales, VenteDetail{
				UUID:         rs.VenteUuid,
				FactureUUID:  rs.FactureUuid,
				VendeurEmail: rs.VendeurEmail,
				ProductName:  rs.ProduitName,
				Price:        priceVal,
			})
		}
	}

	return stats, nil
}
