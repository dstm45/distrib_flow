package database

import (
	"context"
	"errors"
	"log"

	"github.com/go-faker/faker/v4"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// SeedDatabase seeds the default admin, default owner, and default products if they do not exist.
func SeedDatabase(ctx context.Context, q *Queries) error {
	// 1. Seed default admin if not exists
	_, err := q.GetUserByEmail(ctx, "admin@distribflow.com")
	if errors.Is(err, pgx.ErrNoRows) {
		log.Println("Seeding default admin user (admin@distribflow.com)...")
		const adminPasswordHash = "$2b$10$gIOr.3DPgbtbY/aZ4qZy3OC.Y64RnSr6e4Ksgo6ZrxRbUjvz9pnZ6"
		user, err := q.NewUser(ctx, NewUserParams{
			Email:        "admin@distribflow.com",
			PasswordHash: adminPasswordHash,
			Role:         RoleAdmin,
		})
		if err == nil {
			_ = q.CreateAdmin(ctx, user.Uuid)
		} else {
			log.Printf("Erreur lors du seeding de l'admin: %v\n", err)
		}
	} else if err != nil {
		log.Printf("Erreur lors de la vérification de l'admin: %v\n", err)
	}

	// 2. Seed default owner if not exists
	_, err = q.GetUserByEmail(ctx, "owner@distribflow.com")
	if errors.Is(err, pgx.ErrNoRows) {
		log.Println("Seeding default franchise owner user (owner@distribflow.com)...")
		const ownerPasswordHash = "$2b$12$FKJSaAgcLA.UCmxcZutnbONtjc7dDnFZYqkajnaV3it9dDIlPrdkG"
		owner, err := q.NewUser(ctx, NewUserParams{
			Email:        "owner@distribflow.com",
			PasswordHash: ownerPasswordHash,
			Role:         RoleFranchiseOwner,
		})
		if err == nil {
			// Create a default franchise to link to
			franchise, err := q.CreateFranchise(ctx)
			if err == nil {
				_ = q.CreateFranchiseOwner(ctx, CreateFranchiseOwnerParams{
					UserUuid:      owner.Uuid,
					FranchiseUuid: franchise.Uuid,
				})
			}
		} else {
			log.Printf("Erreur lors du seeding de l'owner: %v\n", err)
		}
	}

	// 3. Seed default products if empty or has outdated European products
	products, err := q.ListProduits(ctx)
	hasOldProducts := false
	if err == nil {
		for _, p := range products {
			if p.Name == "Croissant" || p.Name == "Pain au Chocolat" {
				hasOldProducts = true
				break
			}
		}
	}

	if hasOldProducts || len(products) == 0 {
		log.Println("Clearing old products and transactions to seed Congolese supermarket products...")
		_ = q.ClearAllVentes(ctx)
		_ = q.ClearAllFactures(ctx)
		_ = q.ClearAllProduits(ctx)

		log.Println("Seeding Congolese products (in CDF)...")
		defaultProds := []struct {
			Name  string
			Price float64
		}{
			{"Sac de Semoule de Maïs (5kg)", 12500},
			{"Sac de Riz Basmati (5kg)", 18500},
			{"Café du Kivu (250g)", 9500},
			{"Bouteille d'Eau Pure (1.5L)", 1500},
			{"Lait en Poudre Loya (400g)", 8000},
			{"Jus Fiesta Ananas (1L)", 3500},
			{"Canette de Top Pamplemousse", 2500},
			{"Huile de Palme Raffinée (1L)", 4500},
		}

		for _, p := range defaultProds {
			_, err = q.CreateProduit(ctx, CreateProduitParams{
				Name:  p.Name,
				Price: pgtype.Float8{Float64: p.Price, Valid: true},
			})
			if err != nil {
				log.Printf("Erreur lors de la création du produit %s: %v\n", p.Name, err)
			}
		}

		// Use go-faker to seed some extra random products as requested
		log.Println("Seeding randomized extra products using go-faker...")
		for i := 0; i < 4; i++ {
			// Generate fake word for product name
			fakeWord := faker.Word()
			name := "Produit Importé - " + fakeWord
			
			// Generate a fake price in Congolese Francs (CDF), e.g. between 1500 and 15000 CDF, rounded to nearest 100
			price := float64((faker.RandomUnixTime() % 135) * 100 + 1500)

			_, err = q.CreateProduit(ctx, CreateProduitParams{
				Name:  name,
				Price: pgtype.Float8{Float64: price, Valid: true},
			})
			if err != nil {
				log.Printf("Erreur lors du seeding faker du produit %s: %v\n", name, err)
			}
		}
	}

	return nil
}
