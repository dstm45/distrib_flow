package services

import (
	"context"

	"github.com/dstm45/template/pkg/database"
	"github.com/google/uuid"
)

type FranchiseOwnerService interface {
	AddOwner(ctx context.Context, userID, franchiseID uuid.UUID) error
	GetOwnersByFranchise(ctx context.Context, franchiseID uuid.UUID) ([]uuid.UUID, error)
	GetFranchisesByOwner(ctx context.Context, userID uuid.UUID) ([]database.Franchise, error)
	RemoveOwner(ctx context.Context, userID, franchiseID uuid.UUID) error
}

type franchiseOwnerService struct {
	DB *database.Queries
}

func NewFranchiseOwnerService(queries *database.Queries) FranchiseOwnerService {
	return &franchiseOwnerService{DB: queries}
}

func (s *franchiseOwnerService) AddOwner(ctx context.Context, userID, franchiseID uuid.UUID) error {
	return s.DB.CreateFranchiseOwner(ctx, database.CreateFranchiseOwnerParams{
		UserUuid:      userID,
		FranchiseUuid: franchiseID,
	})
}

func (s *franchiseOwnerService) GetOwnersByFranchise(ctx context.Context, franchiseID uuid.UUID) ([]uuid.UUID, error) {
	owners, err := s.DB.GetFranchiseOwnersByFranchise(ctx, franchiseID)
	if err != nil {
		return nil, err
	}
	var userIDs []uuid.UUID
	for _, o := range owners {
		userIDs = append(userIDs, o.UserUuid)
	}
	return userIDs, nil
}

func (s *franchiseOwnerService) GetFranchisesByOwner(ctx context.Context, userID uuid.UUID) ([]database.Franchise, error) {
	return s.DB.GetFranchisesByOwner(ctx, userID)
}

func (s *franchiseOwnerService) RemoveOwner(ctx context.Context, userID, franchiseID uuid.UUID) error {
	return s.DB.DeleteFranchiseOwner(ctx, database.DeleteFranchiseOwnerParams{
		UserUuid:      userID,
		FranchiseUuid: franchiseID,
	})
}
