// Package controllers contient tous les controlleurs
package controllers

import "github.com/dstm45/template/pkg/services"

type UserController struct {
	UserService services.AdminService
}

func NewUserController(svc services.AdminService) *UserController {
	return &UserController{
		UserService: svc,
	}
}
