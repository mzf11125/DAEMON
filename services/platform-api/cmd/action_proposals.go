package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/daemon-platform/daemon/packages/go-common/auth"
	"github.com/daemon-platform/daemon/packages/go-common/db"
	dhttp "github.com/daemon-platform/daemon/packages/go-common/http"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func mountActionProposalRoutes(r chi.Router, pool *pgxpool.Pool) {
	r.Post("/action-proposals", createActionProposal(pool))
	r.Get("/action-proposals", listActionProposals(pool))
	r.Get("/action-proposals/{id}", getActionProposal(pool))
	r.Patch("/action-proposals/{id}", patchActionProposal(pool))
}

type actionProposalRow struct {
	ProposalID            string          `json:"proposalId"`
	ActionType            string          `json:"actionType"`
	Status                string          `json:"status"`
	Parameters            json.RawMessage `json:"parameters"`
	RequiresHumanApproval bool            `json:"requiresHumanApproval"`
	CaseID                *string         `json:"caseId,omitempty"`
	ReviewFlags           json.RawMessage `json:"reviewFlags"`
	CreatedBy             *string         `json:"createdBy,omitempty"`
	CreatedAt             time.Time       `json:"createdAt"`
	UpdatedAt             time.Time       `json:"updatedAt"`
}

func createActionProposal(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenant := dhttp.TenantFromContext(r.Context())
		var body struct {
			ActionType            string          `json:"actionType"`
			Status                string          `json:"status"`
			Parameters            json.RawMessage `json:"parameters"`
			RequiresHumanApproval *bool           `json:"requiresHumanApproval"`
			CaseID                string          `json:"caseId"`
			ReviewFlags           json.RawMessage `json:"reviewFlags"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", err.Error())
			return
		}
		if body.ActionType == "" {
			dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "MISSING_ACTION_TYPE", "actionType required")
			return
		}
		status := body.Status
		if status == "" {
			status = "proposed"
		}
		params := body.Parameters
		if len(params) == 0 {
			params = json.RawMessage(`{}`)
		}
		flags := body.ReviewFlags
		if len(flags) == 0 {
			flags = json.RawMessage(`[]`)
		}
		requires := true
		if body.RequiresHumanApproval != nil {
			requires = *body.RequiresHumanApproval
		}
		createdBy := auth.UserIDFromContext(r.Context())
		var row actionProposalRow
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			return tx.QueryRow(r.Context(), `
				INSERT INTO action_proposals (
					tenant_id, action_type, status, parameters, requires_human_approval,
					case_id, review_flags, created_by
				) VALUES ($1, $2, $3, $4::jsonb, $5, NULLIF($6, ''), $7::jsonb, NULLIF($8, ''))
				RETURNING proposal_id::text, action_type, status, parameters, requires_human_approval,
					case_id, review_flags, created_by, created_at, updated_at`,
				tenant, body.ActionType, status, string(params), requires,
				body.CaseID, string(flags), createdBy,
			).Scan(
				&row.ProposalID, &row.ActionType, &row.Status, &row.Parameters,
				&row.RequiresHumanApproval, &row.CaseID, &row.ReviewFlags,
				&row.CreatedBy, &row.CreatedAt, &row.UpdatedAt,
			)
		})
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		dhttp.WriteJSON(w, http.StatusCreated, row)
	}
}

func listActionProposals(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenant := dhttp.TenantFromContext(r.Context())
		caseID := r.URL.Query().Get("caseId")
		status := r.URL.Query().Get("status")
		var rows []actionProposalRow
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			q := `
				SELECT proposal_id::text, action_type, status, parameters, requires_human_approval,
					case_id, review_flags, created_by, created_at, updated_at
				FROM action_proposals WHERE tenant_id = $1`
			args := []any{tenant}
			n := 2
			if caseID != "" {
				q += fmt.Sprintf(` AND case_id = $%d`, n)
				args = append(args, caseID)
				n++
			}
			if status != "" {
				q += fmt.Sprintf(` AND status = $%d`, n)
				args = append(args, status)
			}
			q += ` ORDER BY created_at DESC LIMIT 100`
			cur, err := tx.Query(r.Context(), q, args...)
			if err != nil {
				return err
			}
			defer cur.Close()
			for cur.Next() {
				var row actionProposalRow
				if err := cur.Scan(
					&row.ProposalID, &row.ActionType, &row.Status, &row.Parameters,
					&row.RequiresHumanApproval, &row.CaseID, &row.ReviewFlags,
					&row.CreatedBy, &row.CreatedAt, &row.UpdatedAt,
				); err != nil {
					return err
				}
				rows = append(rows, row)
			}
			return cur.Err()
		})
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		if rows == nil {
			rows = []actionProposalRow{}
		}
		dhttp.WriteJSON(w, http.StatusOK, map[string]any{"items": rows})
	}
}

func getActionProposal(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenant := dhttp.TenantFromContext(r.Context())
		id := chi.URLParam(r, "id")
		if id == "" {
			dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_REQUEST", "id required")
			return
		}
		var row actionProposalRow
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			return tx.QueryRow(r.Context(), `
				SELECT proposal_id::text, action_type, status, parameters, requires_human_approval,
					case_id, review_flags, created_by, created_at, updated_at
				FROM action_proposals WHERE tenant_id = $1 AND proposal_id = $2::uuid`,
				tenant, id,
			).Scan(
				&row.ProposalID, &row.ActionType, &row.Status, &row.Parameters,
				&row.RequiresHumanApproval, &row.CaseID, &row.ReviewFlags,
				&row.CreatedBy, &row.CreatedAt, &row.UpdatedAt,
			)
		})
		if errors.Is(err, pgx.ErrNoRows) {
			dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "proposal not found")
			return
		}
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		dhttp.WriteJSON(w, http.StatusOK, row)
	}
}

func patchActionProposal(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenant := dhttp.TenantFromContext(r.Context())
		id := chi.URLParam(r, "id")
		if id == "" {
			dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_REQUEST", "id required")
			return
		}
		var body struct {
			Status string `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "INVALID_JSON", err.Error())
			return
		}
		if body.Status == "" {
			dhttp.WriteErrorRequest(w, r, http.StatusBadRequest, "MISSING_STATUS", "status required")
			return
		}
		var row actionProposalRow
		err := db.WithRLSTx(r.Context(), pool, func(tx pgx.Tx) error {
			return tx.QueryRow(r.Context(), `
				UPDATE action_proposals SET status = $3, updated_at = NOW()
				WHERE tenant_id = $1 AND proposal_id = $2::uuid
				RETURNING proposal_id::text, action_type, status, parameters, requires_human_approval,
					case_id, review_flags, created_by, created_at, updated_at`,
				tenant, id, body.Status,
			).Scan(
				&row.ProposalID, &row.ActionType, &row.Status, &row.Parameters,
				&row.RequiresHumanApproval, &row.CaseID, &row.ReviewFlags,
				&row.CreatedBy, &row.CreatedAt, &row.UpdatedAt,
			)
		})
		if errors.Is(err, pgx.ErrNoRows) {
			dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "NOT_FOUND", "proposal not found")
			return
		}
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		dhttp.WriteJSON(w, http.StatusOK, row)
	}
}
