export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      adjustments: {
        Row: {
          adjustment_date: string
          adjustment_type: string
          amount: number
          applied_at: string | null
          approved_at: string | null
          approved_by: string | null
          charge_id: string | null
          clinic_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          directionality: string
          foreign_id: string | null
          foreign_id_type: string | null
          id: string
          metadata: Json | null
          nexhealth_id: number | null
          nexhealth_synced_at: string | null
          notes: string | null
          patient_id: string | null
          procedure_id: string | null
          provider_id: string | null
          reason_code: string | null
          reason_description: string | null
          requires_approval: boolean | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          adjustment_date?: string
          adjustment_type: string
          amount?: number
          applied_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          charge_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          directionality?: string
          foreign_id?: string | null
          foreign_id_type?: string | null
          id?: string
          metadata?: Json | null
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          notes?: string | null
          patient_id?: string | null
          procedure_id?: string | null
          provider_id?: string | null
          reason_code?: string | null
          reason_description?: string | null
          requires_approval?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          adjustment_date?: string
          adjustment_type?: string
          amount?: number
          applied_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          charge_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          directionality?: string
          foreign_id?: string | null
          foreign_id_type?: string | null
          id?: string
          metadata?: Json | null
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          notes?: string | null
          patient_id?: string | null
          procedure_id?: string | null
          provider_id?: string | null
          reason_code?: string | null
          reason_description?: string | null
          requires_approval?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adjustments_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustments_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_activity_logs: {
        Row: {
          activity_name: string
          activity_status: string
          activity_type: string
          call_log_id: string | null
          clinic_id: string | null
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          function_arguments: Json | null
          function_name: string | null
          function_result: Json | null
          id: string
          input_data: Json | null
          metadata: Json | null
          output_data: Json | null
          sequence_number: number
          started_at: string | null
        }
        Insert: {
          activity_name: string
          activity_status: string
          activity_type: string
          call_log_id?: string | null
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          function_arguments?: Json | null
          function_name?: string | null
          function_result?: Json | null
          id?: string
          input_data?: Json | null
          metadata?: Json | null
          output_data?: Json | null
          sequence_number: number
          started_at?: string | null
        }
        Update: {
          activity_name?: string
          activity_status?: string
          activity_type?: string
          call_log_id?: string | null
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          function_arguments?: Json | null
          function_name?: string | null
          function_result?: Json | null
          id?: string
          input_data?: Json | null
          metadata?: Json | null
          output_data?: Json | null
          sequence_number?: number
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_activity_logs_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_activity_logs_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "v_call_workflow_status"
            referencedColumns: ["call_log_id"]
          },
          {
            foreignKeyName: "agent_activity_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_run_logs: {
        Row: {
          agent_type: string
          clinic_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          items_failed: number | null
          items_processed: number | null
          items_succeeded: number | null
          metadata: Json | null
          started_at: string | null
          status: string
          summary: string | null
        }
        Insert: {
          agent_type: string
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          items_failed?: number | null
          items_processed?: number | null
          items_succeeded?: number | null
          metadata?: Json | null
          started_at?: string | null
          status?: string
          summary?: string | null
        }
        Update: {
          agent_type?: string
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          items_failed?: number | null
          items_processed?: number | null
          items_succeeded?: number | null
          metadata?: Json | null
          started_at?: string | null
          status?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_run_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_config_audit: {
        Row: {
          action: string
          agent_id: string | null
          changed_at: string | null
          changed_by: string | null
          clinic_id: string | null
          field_changed: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action: string
          agent_id?: string | null
          changed_at?: string | null
          changed_by?: string | null
          clinic_id?: string | null
          field_changed?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action?: string
          agent_id?: string | null
          changed_at?: string | null
          changed_by?: string | null
          clinic_id?: string | null
          field_changed?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_config_audit_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_config_audit_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_configurations: {
        Row: {
          agent_name: string
          agent_type: string
          avatar_gender: string | null
          clinic_id: string | null
          conversation_rules: Json | null
          created_at: string | null
          elevenlabs_agent_id: string | null
          elevenlabs_llm_model: string | null
          elevenlabs_model: string | null
          elevenlabs_similarity_boost: number | null
          elevenlabs_stability: number | null
          elevenlabs_style: number | null
          elevenlabs_voice_id: string | null
          first_message: string | null
          id: string
          is_active: boolean | null
          knowledge_base_document_ids: string[] | null
          language: string | null
          model: string
          response_style: string
          speech_settings: Json | null
          system_prompt: string | null
          twilio_phone_number: string | null
          updated_at: string | null
          use_elevenlabs: boolean | null
          voice: string
        }
        Insert: {
          agent_name?: string
          agent_type?: string
          avatar_gender?: string | null
          clinic_id?: string | null
          conversation_rules?: Json | null
          created_at?: string | null
          elevenlabs_agent_id?: string | null
          elevenlabs_llm_model?: string | null
          elevenlabs_model?: string | null
          elevenlabs_similarity_boost?: number | null
          elevenlabs_stability?: number | null
          elevenlabs_style?: number | null
          elevenlabs_voice_id?: string | null
          first_message?: string | null
          id?: string
          is_active?: boolean | null
          knowledge_base_document_ids?: string[] | null
          language?: string | null
          model?: string
          response_style?: string
          speech_settings?: Json | null
          system_prompt?: string | null
          twilio_phone_number?: string | null
          updated_at?: string | null
          use_elevenlabs?: boolean | null
          voice?: string
        }
        Update: {
          agent_name?: string
          agent_type?: string
          avatar_gender?: string | null
          clinic_id?: string | null
          conversation_rules?: Json | null
          created_at?: string | null
          elevenlabs_agent_id?: string | null
          elevenlabs_llm_model?: string | null
          elevenlabs_model?: string | null
          elevenlabs_similarity_boost?: number | null
          elevenlabs_stability?: number | null
          elevenlabs_style?: number | null
          elevenlabs_voice_id?: string | null
          first_message?: string | null
          id?: string
          is_active?: boolean | null
          knowledge_base_document_ids?: string[] | null
          language?: string | null
          model?: string
          response_style?: string
          speech_settings?: Json | null
          system_prompt?: string | null
          twilio_phone_number?: string | null
          updated_at?: string | null
          use_elevenlabs?: boolean | null
          voice?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_configurations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_benchmarks: {
        Row: {
          avg_deal_value: number | null
          avg_human_handling_minutes: number | null
          avg_human_hourly_cost: number | null
          avg_revenue_per_appointment: number | null
          baseline_conversion_rate: number | null
          baseline_no_show_rate: number | null
          clinic_id: string
          created_at: string | null
          id: string
          metric_type: string
          updated_at: string | null
        }
        Insert: {
          avg_deal_value?: number | null
          avg_human_handling_minutes?: number | null
          avg_human_hourly_cost?: number | null
          avg_revenue_per_appointment?: number | null
          baseline_conversion_rate?: number | null
          baseline_no_show_rate?: number | null
          clinic_id: string
          created_at?: string | null
          id?: string
          metric_type: string
          updated_at?: string | null
        }
        Update: {
          avg_deal_value?: number | null
          avg_human_handling_minutes?: number | null
          avg_human_hourly_cost?: number | null
          avg_revenue_per_appointment?: number | null
          baseline_conversion_rate?: number | null
          baseline_no_show_rate?: number | null
          clinic_id?: string
          created_at?: string | null
          id?: string
          metric_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_benchmarks_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_interactions: {
        Row: {
          call_log_id: string | null
          clinic_id: string | null
          confidence: number | null
          created_at: string | null
          function_calls: Json | null
          id: string
          input_text: string | null
          intent: string | null
          interaction_type: string
          latency_ms: number | null
          model_used: string | null
          output_text: string | null
          patient_id: string | null
          tokens_used: number | null
        }
        Insert: {
          call_log_id?: string | null
          clinic_id?: string | null
          confidence?: number | null
          created_at?: string | null
          function_calls?: Json | null
          id?: string
          input_text?: string | null
          intent?: string | null
          interaction_type: string
          latency_ms?: number | null
          model_used?: string | null
          output_text?: string | null
          patient_id?: string | null
          tokens_used?: number | null
        }
        Update: {
          call_log_id?: string | null
          clinic_id?: string | null
          confidence?: number | null
          created_at?: string | null
          function_calls?: Json | null
          id?: string
          input_text?: string | null
          intent?: string | null
          interaction_type?: string
          latency_ms?: number | null
          model_used?: string | null
          output_text?: string | null
          patient_id?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_interactions_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_interactions_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "v_call_workflow_status"
            referencedColumns: ["call_log_id"]
          },
          {
            foreignKeyName: "ai_interactions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_interactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_interactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_agent_runs: {
        Row: {
          clinic_id: string | null
          completed_at: string | null
          created_at: string | null
          critical_found: number | null
          error_message: string | null
          high_risk_no_show: number | null
          id: string
          patients_analyzed: number | null
          started_at: string | null
          status: string | null
          summary: string | null
          urgent_followup: number | null
        }
        Insert: {
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          critical_found?: number | null
          error_message?: string | null
          high_risk_no_show?: number | null
          id?: string
          patients_analyzed?: number | null
          started_at?: string | null
          status?: string | null
          summary?: string | null
          urgent_followup?: number | null
        }
        Update: {
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          critical_found?: number | null
          error_message?: string | null
          high_risk_no_show?: number | null
          id?: string
          patients_analyzed?: number | null
          started_at?: string | null
          status?: string | null
          summary?: string | null
          urgent_followup?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_agent_runs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_alerts: {
        Row: {
          agent_analysis: Json | null
          alert_type: string
          appointment_id: string | null
          auto_generated: boolean | null
          clinic_id: string | null
          created_at: string | null
          description: string | null
          id: string
          patient_id: string | null
          priority: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          suggested_action: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          agent_analysis?: Json | null
          alert_type: string
          appointment_id?: string | null
          auto_generated?: boolean | null
          clinic_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          patient_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          suggested_action?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          agent_analysis?: Json | null
          alert_type?: string
          appointment_id?: string | null
          auto_generated?: boolean | null
          clinic_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          patient_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          suggested_action?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_alerts_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_slots: {
        Row: {
          appointment_id: string | null
          appointment_type_id: string | null
          clinic_id: string | null
          created_at: string | null
          duration_minutes: number | null
          end_time: string
          foreign_id: string | null
          foreign_id_type: string | null
          held_by: string | null
          held_until: string | null
          id: string
          institution_id: number | null
          location_id: number | null
          operatory_id: number | null
          provider_id: string
          slot_date: string
          start_time: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          appointment_type_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          end_time: string
          foreign_id?: string | null
          foreign_id_type?: string | null
          held_by?: string | null
          held_until?: string | null
          id?: string
          institution_id?: number | null
          location_id?: number | null
          operatory_id?: number | null
          provider_id: string
          slot_date: string
          start_time: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          appointment_type_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          end_time?: string
          foreign_id?: string | null
          foreign_id_type?: string | null
          held_by?: string | null
          held_until?: string | null
          id?: string
          institution_id?: number | null
          location_id?: number | null
          operatory_id?: number | null
          provider_id?: string
          slot_date?: string
          start_time?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_slots_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_slots_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_slots_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_slots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "institution_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_slots_operatory_id_fkey"
            columns: ["operatory_id"]
            isOneToOne: false
            referencedRelation: "operatories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_slots_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_types: {
        Row: {
          buffer_after: number | null
          buffer_before: number | null
          category: string | null
          clinic_id: string | null
          code: string | null
          color: string | null
          created_at: string | null
          default_price: number | null
          deposit_amount: number | null
          description: string | null
          duration_minutes: number
          foreign_id: string | null
          foreign_id_type: string | null
          icon: string | null
          id: string
          institution_id: number | null
          is_active: boolean | null
          is_bookable_online: boolean | null
          location_id: number | null
          max_advance_days: number | null
          max_per_day: number | null
          min_notice_hours: number | null
          name: string
          nexhealth_synced_at: string | null
          operatory_id: number | null
          requires_deposit: boolean | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          buffer_after?: number | null
          buffer_before?: number | null
          category?: string | null
          clinic_id?: string | null
          code?: string | null
          color?: string | null
          created_at?: string | null
          default_price?: number | null
          deposit_amount?: number | null
          description?: string | null
          duration_minutes?: number
          foreign_id?: string | null
          foreign_id_type?: string | null
          icon?: string | null
          id?: string
          institution_id?: number | null
          is_active?: boolean | null
          is_bookable_online?: boolean | null
          location_id?: number | null
          max_advance_days?: number | null
          max_per_day?: number | null
          min_notice_hours?: number | null
          name: string
          nexhealth_synced_at?: string | null
          operatory_id?: number | null
          requires_deposit?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          buffer_after?: number | null
          buffer_before?: number | null
          category?: string | null
          clinic_id?: string | null
          code?: string | null
          color?: string | null
          created_at?: string | null
          default_price?: number | null
          deposit_amount?: number | null
          description?: string | null
          duration_minutes?: number
          foreign_id?: string | null
          foreign_id_type?: string | null
          icon?: string | null
          id?: string
          institution_id?: number | null
          is_active?: boolean | null
          is_bookable_online?: boolean | null
          location_id?: number | null
          max_advance_days?: number | null
          max_per_day?: number | null
          min_notice_hours?: number | null
          name?: string
          nexhealth_synced_at?: string | null
          operatory_id?: number | null
          requires_deposit?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_types_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_types_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "institution_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_types_operatory_id_fkey"
            columns: ["operatory_id"]
            isOneToOne: false
            referencedRelation: "operatories"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_type: string | null
          appointment_type_id: string | null
          booking_source: string | null
          cancellation_reason: string | null
          check_in_at: string | null
          check_out_at: string | null
          checked_in_at: string | null
          checked_out_at: string | null
          clinic_id: string | null
          confirmation_code: string | null
          copay_amount: number | null
          copay_paid: boolean | null
          copay_paid_at: string | null
          created_at: string | null
          duration: number | null
          end_time: string
          foreign_id: string | null
          foreign_id_type: string | null
          google_event_id: string | null
          id: string
          institution_id: number | null
          is_recurring: boolean | null
          is_seeded: boolean
          location_id: number | null
          nexhealth_sync_status: string | null
          nexhealth_synced_at: string | null
          notes: string | null
          operatory_id: number | null
          patient_id: string | null
          provider_id: string | null
          reason: string | null
          recurring_parent_id: string | null
          recurring_pattern: Json | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          seed_batch_id: string | null
          start_time: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          appointment_type?: string | null
          appointment_type_id?: string | null
          booking_source?: string | null
          cancellation_reason?: string | null
          check_in_at?: string | null
          check_out_at?: string | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          clinic_id?: string | null
          confirmation_code?: string | null
          copay_amount?: number | null
          copay_paid?: boolean | null
          copay_paid_at?: string | null
          created_at?: string | null
          duration?: number | null
          end_time: string
          foreign_id?: string | null
          foreign_id_type?: string | null
          google_event_id?: string | null
          id?: string
          institution_id?: number | null
          is_recurring?: boolean | null
          is_seeded?: boolean
          location_id?: number | null
          nexhealth_sync_status?: string | null
          nexhealth_synced_at?: string | null
          notes?: string | null
          operatory_id?: number | null
          patient_id?: string | null
          provider_id?: string | null
          reason?: string | null
          recurring_parent_id?: string | null
          recurring_pattern?: Json | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          seed_batch_id?: string | null
          start_time: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_type?: string | null
          appointment_type_id?: string | null
          booking_source?: string | null
          cancellation_reason?: string | null
          check_in_at?: string | null
          check_out_at?: string | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          clinic_id?: string | null
          confirmation_code?: string | null
          copay_amount?: number | null
          copay_paid?: boolean | null
          copay_paid_at?: string | null
          created_at?: string | null
          duration?: number | null
          end_time?: string
          foreign_id?: string | null
          foreign_id_type?: string | null
          google_event_id?: string | null
          id?: string
          institution_id?: number | null
          is_recurring?: boolean | null
          is_seeded?: boolean
          location_id?: number | null
          nexhealth_sync_status?: string | null
          nexhealth_synced_at?: string | null
          notes?: string | null
          operatory_id?: number | null
          patient_id?: string | null
          provider_id?: string | null
          reason?: string | null
          recurring_parent_id?: string | null
          recurring_pattern?: Json | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          seed_batch_id?: string | null
          start_time?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "institution_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_operatory_id_fkey"
            columns: ["operatory_id"]
            isOneToOne: false
            referencedRelation: "operatories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_recurring_parent_id_fkey"
            columns: ["recurring_parent_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_seed_batch_id_fkey"
            columns: ["seed_batch_id"]
            isOneToOne: false
            referencedRelation: "seed_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_policy_settings: {
        Row: {
          block_disposable_emails: boolean
          check_hibp_breaches: boolean
          clinic_id: string | null
          created_at: string | null
          id: string
          is_active: boolean
          min_password_length: number
          password_rotation_days: number
          require_lowercase: boolean
          require_number: boolean
          require_special_char: boolean
          require_uppercase: boolean
          updated_at: string | null
          verify_mx_records: boolean
        }
        Insert: {
          block_disposable_emails?: boolean
          check_hibp_breaches?: boolean
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          min_password_length?: number
          password_rotation_days?: number
          require_lowercase?: boolean
          require_number?: boolean
          require_special_char?: boolean
          require_uppercase?: boolean
          updated_at?: string | null
          verify_mx_records?: boolean
        }
        Update: {
          block_disposable_emails?: boolean
          check_hibp_breaches?: boolean
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          min_password_length?: number
          password_rotation_days?: number
          require_lowercase?: boolean
          require_number?: boolean
          require_special_char?: boolean
          require_uppercase?: boolean
          updated_at?: string | null
          verify_mx_records?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "auth_policy_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_tasks: {
        Row: {
          agent_analysis: Json | null
          amount_at_stake: number | null
          assigned_to: string | null
          auto_generated: boolean | null
          claim_id: string | null
          clinic_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          days_outstanding: number | null
          description: string | null
          due_date: string | null
          id: string
          patient_id: string | null
          priority: string
          resolution_notes: string | null
          status: string
          suggested_action: string | null
          task_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          agent_analysis?: Json | null
          amount_at_stake?: number | null
          assigned_to?: string | null
          auto_generated?: boolean | null
          claim_id?: string | null
          clinic_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          days_outstanding?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          patient_id?: string | null
          priority?: string
          resolution_notes?: string | null
          status?: string
          suggested_action?: string | null
          task_type?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          agent_analysis?: Json | null
          amount_at_stake?: number | null
          assigned_to?: string | null
          auto_generated?: boolean | null
          claim_id?: string | null
          clinic_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          days_outstanding?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          patient_id?: string | null
          priority?: string
          resolution_notes?: string | null
          status?: string
          suggested_action?: string | null
          task_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_tasks_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_tasks_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          ai_provider: string | null
          appointment_booked: boolean | null
          appointment_id: string | null
          call_sid: string | null
          call_type: string
          clinic_id: string | null
          created_at: string | null
          direction: string
          duration: number | null
          elevenlabs_agent_id: string | null
          elevenlabs_conversation_id: string | null
          ended_at: string | null
          from_number: string | null
          id: string
          insurance_verified: boolean | null
          is_seeded: boolean
          metadata: Json | null
          outcome: string | null
          outcome_details: Json | null
          patient_id: string | null
          patient_validated: boolean | null
          recording_url: string | null
          seed_batch_id: string | null
          started_at: string | null
          status: string | null
          to_number: string | null
          transcript: string | null
          updated_at: string | null
          workflow_status: Json | null
        }
        Insert: {
          ai_provider?: string | null
          appointment_booked?: boolean | null
          appointment_id?: string | null
          call_sid?: string | null
          call_type: string
          clinic_id?: string | null
          created_at?: string | null
          direction: string
          duration?: number | null
          elevenlabs_agent_id?: string | null
          elevenlabs_conversation_id?: string | null
          ended_at?: string | null
          from_number?: string | null
          id?: string
          insurance_verified?: boolean | null
          is_seeded?: boolean
          metadata?: Json | null
          outcome?: string | null
          outcome_details?: Json | null
          patient_id?: string | null
          patient_validated?: boolean | null
          recording_url?: string | null
          seed_batch_id?: string | null
          started_at?: string | null
          status?: string | null
          to_number?: string | null
          transcript?: string | null
          updated_at?: string | null
          workflow_status?: Json | null
        }
        Update: {
          ai_provider?: string | null
          appointment_booked?: boolean | null
          appointment_id?: string | null
          call_sid?: string | null
          call_type?: string
          clinic_id?: string | null
          created_at?: string | null
          direction?: string
          duration?: number | null
          elevenlabs_agent_id?: string | null
          elevenlabs_conversation_id?: string | null
          ended_at?: string | null
          from_number?: string | null
          id?: string
          insurance_verified?: boolean | null
          is_seeded?: boolean
          metadata?: Json | null
          outcome?: string | null
          outcome_details?: Json | null
          patient_id?: string | null
          patient_validated?: boolean | null
          recording_url?: string | null
          seed_batch_id?: string | null
          started_at?: string | null
          status?: string | null
          to_number?: string | null
          transcript?: string | null
          updated_at?: string | null
          workflow_status?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_seed_batch_id_fkey"
            columns: ["seed_batch_id"]
            isOneToOne: false
            referencedRelation: "seed_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      charges: {
        Row: {
          adjustment_amount: number | null
          amount: number
          appointment_id: string | null
          balance: number | null
          billing_status: string | null
          charge_date: string
          claim_id: string | null
          clinic_id: string | null
          created_at: string | null
          description: string | null
          diagnosis_codes: string[] | null
          foreign_id: string | null
          foreign_id_type: string | null
          id: string
          insurance_paid: number | null
          insurance_plan_id: string | null
          insurance_portion: number | null
          metadata: Json | null
          nexhealth_id: number | null
          nexhealth_synced_at: string | null
          notes: string | null
          patient_id: string | null
          patient_paid: number | null
          patient_portion: number | null
          procedure_code: string | null
          procedure_id: string | null
          provider_id: string | null
          quantity: number | null
          status: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          adjustment_amount?: number | null
          amount?: number
          appointment_id?: string | null
          balance?: number | null
          billing_status?: string | null
          charge_date?: string
          claim_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          description?: string | null
          diagnosis_codes?: string[] | null
          foreign_id?: string | null
          foreign_id_type?: string | null
          id?: string
          insurance_paid?: number | null
          insurance_plan_id?: string | null
          insurance_portion?: number | null
          metadata?: Json | null
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          notes?: string | null
          patient_id?: string | null
          patient_paid?: number | null
          patient_portion?: number | null
          procedure_code?: string | null
          procedure_id?: string | null
          provider_id?: string | null
          quantity?: number | null
          status?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          adjustment_amount?: number | null
          amount?: number
          appointment_id?: string | null
          balance?: number | null
          billing_status?: string | null
          charge_date?: string
          claim_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          description?: string | null
          diagnosis_codes?: string[] | null
          foreign_id?: string | null
          foreign_id_type?: string | null
          id?: string
          insurance_paid?: number | null
          insurance_plan_id?: string | null
          insurance_portion?: number | null
          metadata?: Json | null
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          notes?: string | null
          patient_id?: string | null
          patient_paid?: number | null
          patient_portion?: number | null
          procedure_code?: string | null
          procedure_id?: string | null
          provider_id?: string | null
          quantity?: number | null
          status?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "charges_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_insurance_plan_id_fkey"
            columns: ["insurance_plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_prep_agent_runs: {
        Row: {
          claims_prepared: number | null
          clinic_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          items_queued: number | null
          procedures_scanned: number | null
          started_at: string | null
          status: string | null
          summary: string | null
          total_amount: number | null
        }
        Insert: {
          claims_prepared?: number | null
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          items_queued?: number | null
          procedures_scanned?: number | null
          started_at?: string | null
          status?: string | null
          summary?: string | null
          total_amount?: number | null
        }
        Update: {
          claims_prepared?: number | null
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          items_queued?: number | null
          procedures_scanned?: number | null
          started_at?: string | null
          status?: string | null
          summary?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_prep_agent_runs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_preparation_queue: {
        Row: {
          agent_analysis: Json | null
          auto_generated: boolean | null
          claim_id: string | null
          clinic_id: string | null
          created_at: string | null
          date_of_service: string | null
          eligibility_notes: string | null
          id: string
          insurance_plan_id: string | null
          insurance_status: string | null
          notes: string | null
          patient_id: string | null
          priority: string | null
          procedure_code: string | null
          procedure_fee: number | null
          procedure_id: string | null
          procedure_name: string | null
          processed_at: string | null
          processed_by: string | null
          provider_id: string | null
          status: string
          suggested_claim_data: Json | null
          updated_at: string | null
          validation_errors: Json | null
        }
        Insert: {
          agent_analysis?: Json | null
          auto_generated?: boolean | null
          claim_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          date_of_service?: string | null
          eligibility_notes?: string | null
          id?: string
          insurance_plan_id?: string | null
          insurance_status?: string | null
          notes?: string | null
          patient_id?: string | null
          priority?: string | null
          procedure_code?: string | null
          procedure_fee?: number | null
          procedure_id?: string | null
          procedure_name?: string | null
          processed_at?: string | null
          processed_by?: string | null
          provider_id?: string | null
          status?: string
          suggested_claim_data?: Json | null
          updated_at?: string | null
          validation_errors?: Json | null
        }
        Update: {
          agent_analysis?: Json | null
          auto_generated?: boolean | null
          claim_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          date_of_service?: string | null
          eligibility_notes?: string | null
          id?: string
          insurance_plan_id?: string | null
          insurance_status?: string | null
          notes?: string | null
          patient_id?: string | null
          priority?: string | null
          procedure_code?: string | null
          procedure_fee?: number | null
          procedure_id?: string | null
          procedure_name?: string | null
          processed_at?: string | null
          processed_by?: string | null
          provider_id?: string | null
          status?: string
          suggested_claim_data?: Json | null
          updated_at?: string | null
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_preparation_queue_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_preparation_queue_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_preparation_queue_insurance_plan_id_fkey"
            columns: ["insurance_plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_preparation_queue_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_preparation_queue_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_preparation_queue_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_preparation_queue_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          amount_billed_to_insurance: number | null
          charge_payouts: Json | null
          charges: Json | null
          clinic_id: string | null
          created_at: string
          date_of_service: string | null
          estimated_insurance_payment: number | null
          foreign_id: string | null
          foreign_id_type: string | null
          guarantor_id: string | null
          id: string
          insurance_payment: number | null
          is_seeded: boolean
          location_id: number | null
          metadata: Json | null
          nexhealth_id: number | null
          nexhealth_synced_at: string | null
          note: string | null
          patient_id: string | null
          primary_insurance_plan_id: string | null
          provider_id: string | null
          received_at: string | null
          secondary_insurance_plan_id: string | null
          seed_batch_id: string | null
          sent_at: string | null
          status: string | null
          updated_at: string
          write_off: number | null
        }
        Insert: {
          amount_billed_to_insurance?: number | null
          charge_payouts?: Json | null
          charges?: Json | null
          clinic_id?: string | null
          created_at?: string
          date_of_service?: string | null
          estimated_insurance_payment?: number | null
          foreign_id?: string | null
          foreign_id_type?: string | null
          guarantor_id?: string | null
          id?: string
          insurance_payment?: number | null
          is_seeded?: boolean
          location_id?: number | null
          metadata?: Json | null
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          note?: string | null
          patient_id?: string | null
          primary_insurance_plan_id?: string | null
          provider_id?: string | null
          received_at?: string | null
          secondary_insurance_plan_id?: string | null
          seed_batch_id?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string
          write_off?: number | null
        }
        Update: {
          amount_billed_to_insurance?: number | null
          charge_payouts?: Json | null
          charges?: Json | null
          clinic_id?: string | null
          created_at?: string
          date_of_service?: string | null
          estimated_insurance_payment?: number | null
          foreign_id?: string | null
          foreign_id_type?: string | null
          guarantor_id?: string | null
          id?: string
          insurance_payment?: number | null
          is_seeded?: boolean
          location_id?: number | null
          metadata?: Json | null
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          note?: string | null
          patient_id?: string | null
          primary_insurance_plan_id?: string | null
          provider_id?: string | null
          received_at?: string | null
          secondary_insurance_plan_id?: string | null
          seed_batch_id?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string
          write_off?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_primary_insurance_plan_id_fkey"
            columns: ["primary_insurance_plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_secondary_insurance_plan_id_fkey"
            columns: ["secondary_insurance_plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_seed_batch_id_fkey"
            columns: ["seed_batch_id"]
            isOneToOne: false
            referencedRelation: "seed_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      claims_agent_configurations: {
        Row: {
          agent_type: string
          aging_thresholds: Json | null
          automation_schedule: Json | null
          clinic_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          notifications: Json | null
          settings: Json | null
          system_prompt: string | null
          updated_at: string | null
        }
        Insert: {
          agent_type: string
          aging_thresholds?: Json | null
          automation_schedule?: Json | null
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notifications?: Json | null
          settings?: Json | null
          system_prompt?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_type?: string
          aging_thresholds?: Json | null
          automation_schedule?: Json | null
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notifications?: Json | null
          settings?: Json | null
          system_prompt?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_agent_configurations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      claims_agent_runs: {
        Row: {
          claims_analyzed: number | null
          clinic_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          started_at: string | null
          status: string | null
          summary: string | null
          tasks_created: number | null
          total_amount_at_risk: number | null
        }
        Insert: {
          claims_analyzed?: number | null
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          summary?: string | null
          tasks_created?: number | null
          total_amount_at_risk?: number | null
        }
        Update: {
          claims_analyzed?: number | null
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          summary?: string | null
          tasks_created?: number | null
          total_amount_at_risk?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_agent_runs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          settings: Json | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          settings?: Json | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          settings?: Json | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      compliance_incidents: {
        Row: {
          audit_log_id: string | null
          clinic_id: string
          created_at: string
          description: string
          id: string
          incident_type: string
          preventive_suggestion: string | null
          recommended_action: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          root_cause: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audit_log_id?: string | null
          clinic_id: string
          created_at?: string
          description: string
          id?: string
          incident_type: string
          preventive_suggestion?: string | null
          recommended_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audit_log_id?: string | null
          clinic_id?: string
          created_at?: string
          description?: string
          id?: string
          incident_type?: string
          preventive_suggestion?: string | null
          recommended_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_incidents_audit_log_id_fkey"
            columns: ["audit_log_id"]
            isOneToOne: false
            referencedRelation: "hipaa_audit_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_rules: {
        Row: {
          clinic_id: string
          conditions: Json
          created_at: string
          id: string
          is_active: boolean
          notification_channels: Json
          rule_name: string
          rule_type: string
          severity: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          notification_channels?: Json
          rule_name: string
          rule_type: string
          severity?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          notification_channels?: Json
          rule_name?: string
          rule_type?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_scores: {
        Row: {
          access_control_score: number
          activity_monitoring_score: number
          clinic_id: string
          created_at: string
          data_exposure_score: number
          details: Json | null
          encryption_score: number
          id: string
          overall_score: number
          score_date: string
        }
        Insert: {
          access_control_score?: number
          activity_monitoring_score?: number
          clinic_id: string
          created_at?: string
          data_exposure_score?: number
          details?: Json | null
          encryption_score?: number
          id?: string
          overall_score?: number
          score_date: string
        }
        Update: {
          access_control_score?: number
          activity_monitoring_score?: number
          clinic_id?: string
          created_at?: string
          data_exposure_score?: number
          details?: Json | null
          encryption_score?: number
          id?: string
          overall_score?: number
          score_date?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          contact_name: string
          created_at: string
          email: string
          id: string
          message: string | null
          num_locations: string | null
          phone: string
          practice_name: string
        }
        Insert: {
          contact_name: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          num_locations?: string | null
          phone: string
          practice_name: string
        }
        Update: {
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          num_locations?: string | null
          phone?: string
          practice_name?: string
        }
        Relationships: []
      }
      conversation_sessions: {
        Row: {
          call_log_id: string | null
          call_sid: string
          conversation_history: Json | null
          created_at: string | null
          id: string
          patient_id: string | null
          turn_count: number | null
          updated_at: string | null
        }
        Insert: {
          call_log_id?: string | null
          call_sid: string
          conversation_history?: Json | null
          created_at?: string | null
          id?: string
          patient_id?: string | null
          turn_count?: number | null
          updated_at?: string | null
        }
        Update: {
          call_log_id?: string | null
          call_sid?: string
          conversation_history?: Json | null
          created_at?: string | null
          id?: string
          patient_id?: string | null
          turn_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_sessions_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_sessions_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "v_call_workflow_status"
            referencedColumns: ["call_log_id"]
          },
          {
            foreignKeyName: "conversation_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_logs: {
        Row: {
          ai_interaction_id: string | null
          call_log_id: string | null
          clinic_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          quantity: number | null
          service_provider: string
          service_type: string
          total_cost: number | null
          unit: string | null
          unit_cost: number | null
        }
        Insert: {
          ai_interaction_id?: string | null
          call_log_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          quantity?: number | null
          service_provider: string
          service_type: string
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Update: {
          ai_interaction_id?: string | null
          call_log_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          quantity?: number | null
          service_provider?: string
          service_type?: string
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_logs_ai_interaction_id_fkey"
            columns: ["ai_interaction_id"]
            isOneToOne: false
            referencedRelation: "ai_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_logs_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_logs_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "v_call_workflow_status"
            referencedColumns: ["call_log_id"]
          },
          {
            foreignKeyName: "cost_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      debug_trigger_log: {
        Row: {
          created_at: string | null
          error: string | null
          id: number
          status: string | null
          step: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: number
          status?: string | null
          step?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: number
          status?: string | null
          step?: string | null
        }
        Relationships: []
      }
      demo_accounts: {
        Row: {
          created_at: string | null
          display_name: string
          email: string
          id: string
          is_active: boolean
          password: string
          role: string
        }
        Insert: {
          created_at?: string | null
          display_name: string
          email: string
          id?: string
          is_active?: boolean
          password: string
          role: string
        }
        Update: {
          created_at?: string | null
          display_name?: string
          email?: string
          id?: string
          is_active?: boolean
          password?: string
          role?: string
        }
        Relationships: []
      }
      document_types: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          description: string | null
          id: number
          is_active: boolean | null
          name: string
          nexhealth_id: number | null
          nexhealth_synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_types_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      el_conv_agents: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          description: string | null
          elevenlabs_agent_id: string
          first_message: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          language: string | null
          llm_model: string | null
          name: string
          settings: Json | null
          system_prompt: string | null
          tools_config: Json | null
          twilio_phone_number: string | null
          twilio_phone_sid: string | null
          updated_at: string | null
          voice_id: string | null
          voice_name: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          description?: string | null
          elevenlabs_agent_id: string
          first_message?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          language?: string | null
          llm_model?: string | null
          name: string
          settings?: Json | null
          system_prompt?: string | null
          tools_config?: Json | null
          twilio_phone_number?: string | null
          twilio_phone_sid?: string | null
          updated_at?: string | null
          voice_id?: string | null
          voice_name?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          description?: string | null
          elevenlabs_agent_id?: string
          first_message?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          language?: string | null
          llm_model?: string | null
          name?: string
          settings?: Json | null
          system_prompt?: string | null
          tools_config?: Json | null
          twilio_phone_number?: string | null
          twilio_phone_sid?: string | null
          updated_at?: string | null
          voice_id?: string | null
          voice_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "el_conv_agents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      el_conv_audit_logs: {
        Row: {
          action: string
          agent_id: string | null
          clinic_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          performed_by: string | null
        }
        Insert: {
          action: string
          agent_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          agent_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "el_conv_audit_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "el_conv_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_conv_audit_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      el_conv_sessions: {
        Row: {
          agent_id: string | null
          caller_number: string | null
          clinic_id: string | null
          cost_data: Json | null
          duration_seconds: number | null
          elevenlabs_conversation_id: string | null
          ended_at: string | null
          id: string
          metadata: Json | null
          outcome: string | null
          patient_id: string | null
          session_type: string
          started_at: string | null
          status: string
          transcript: Json | null
        }
        Insert: {
          agent_id?: string | null
          caller_number?: string | null
          clinic_id?: string | null
          cost_data?: Json | null
          duration_seconds?: number | null
          elevenlabs_conversation_id?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          outcome?: string | null
          patient_id?: string | null
          session_type?: string
          started_at?: string | null
          status?: string
          transcript?: Json | null
        }
        Update: {
          agent_id?: string | null
          caller_number?: string | null
          clinic_id?: string | null
          cost_data?: Json | null
          duration_seconds?: number | null
          elevenlabs_conversation_id?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          outcome?: string | null
          patient_id?: string | null
          session_type?: string
          started_at?: string | null
          status?: string
          transcript?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "el_conv_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "el_conv_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_conv_sessions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_conv_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "el_conv_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
        ]
      }
      elevenlabs_conversations: {
        Row: {
          agent_id: string
          agent_name: string | null
          analysis: Json | null
          call_duration_secs: number | null
          call_log_id: string | null
          clinic_id: string | null
          conversation_id: string
          created_at: string | null
          elevenlabs_cost_usd: number | null
          ended_at: string | null
          evaluation: Json | null
          id: string
          lm_tokens_in: number | null
          lm_tokens_out: number | null
          metadata: Json | null
          recording_available: boolean | null
          recording_url: string | null
          started_at: string | null
          status: string | null
          transcript: Json | null
          tts_characters_used: number | null
          updated_at: string | null
          usage_synced_at: string | null
        }
        Insert: {
          agent_id: string
          agent_name?: string | null
          analysis?: Json | null
          call_duration_secs?: number | null
          call_log_id?: string | null
          clinic_id?: string | null
          conversation_id: string
          created_at?: string | null
          elevenlabs_cost_usd?: number | null
          ended_at?: string | null
          evaluation?: Json | null
          id?: string
          lm_tokens_in?: number | null
          lm_tokens_out?: number | null
          metadata?: Json | null
          recording_available?: boolean | null
          recording_url?: string | null
          started_at?: string | null
          status?: string | null
          transcript?: Json | null
          tts_characters_used?: number | null
          updated_at?: string | null
          usage_synced_at?: string | null
        }
        Update: {
          agent_id?: string
          agent_name?: string | null
          analysis?: Json | null
          call_duration_secs?: number | null
          call_log_id?: string | null
          clinic_id?: string | null
          conversation_id?: string
          created_at?: string | null
          elevenlabs_cost_usd?: number | null
          ended_at?: string | null
          evaluation?: Json | null
          id?: string
          lm_tokens_in?: number | null
          lm_tokens_out?: number | null
          metadata?: Json | null
          recording_available?: boolean | null
          recording_url?: string | null
          started_at?: string | null
          status?: string | null
          transcript?: Json | null
          tts_characters_used?: number | null
          updated_at?: string | null
          usage_synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elevenlabs_conversations_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elevenlabs_conversations_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "v_call_workflow_status"
            referencedColumns: ["call_log_id"]
          },
          {
            foreignKeyName: "elevenlabs_conversations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      eligibility_checks: {
        Row: {
          checked_at: string | null
          clinic_id: string | null
          coinsurance_pct: number | null
          copay_amount: number | null
          coverage_active: boolean | null
          created_at: string | null
          deductible_remaining: number | null
          effective_date: string | null
          expires_at: string | null
          group_number: string | null
          id: string
          in_network: boolean | null
          insurance_plan_id: string | null
          member_id: string | null
          patient_id: string | null
          payer_id: string | null
          payer_name: string | null
          plan_name: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: string
          subscriber_id: string | null
          termination_date: string | null
          updated_at: string | null
        }
        Insert: {
          checked_at?: string | null
          clinic_id?: string | null
          coinsurance_pct?: number | null
          copay_amount?: number | null
          coverage_active?: boolean | null
          created_at?: string | null
          deductible_remaining?: number | null
          effective_date?: string | null
          expires_at?: string | null
          group_number?: string | null
          id?: string
          in_network?: boolean | null
          insurance_plan_id?: string | null
          member_id?: string | null
          patient_id?: string | null
          payer_id?: string | null
          payer_name?: string | null
          plan_name?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          subscriber_id?: string | null
          termination_date?: string | null
          updated_at?: string | null
        }
        Update: {
          checked_at?: string | null
          clinic_id?: string | null
          coinsurance_pct?: number | null
          copay_amount?: number | null
          coverage_active?: boolean | null
          created_at?: string | null
          deductible_remaining?: number | null
          effective_date?: string | null
          expires_at?: string | null
          group_number?: string | null
          id?: string
          in_network?: boolean | null
          insurance_plan_id?: string | null
          member_id?: string | null
          patient_id?: string | null
          payer_id?: string | null
          payer_name?: string | null
          plan_name?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          subscriber_id?: string | null
          termination_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eligibility_checks_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eligibility_checks_insurance_plan_id_fkey"
            columns: ["insurance_plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eligibility_checks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eligibility_checks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_comments: {
        Row: {
          author_label: string
          body: string
          created_at: string
          feedback_item_id: string
          id: string
          user_id: string | null
        }
        Insert: {
          author_label: string
          body: string
          created_at?: string
          feedback_item_id: string
          id?: string
          user_id?: string | null
        }
        Update: {
          author_label?: string
          body?: string
          created_at?: string
          feedback_item_id?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_comments_feedback_item_id_fkey"
            columns: ["feedback_item_id"]
            isOneToOne: false
            referencedRelation: "feedback_items"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_items: {
        Row: {
          category: string | null
          clinic_id: string | null
          comments_count: number
          created_at: string
          description: string
          error_log: string | null
          id: string
          item_number: number
          page_url: string | null
          priority: string | null
          reported_by: string | null
          reporter_email: string | null
          reporter_name: string | null
          resolved_at: string | null
          route_path: string | null
          screenshots: string[] | null
          status: string
          title: string
          type: string
          updated_at: string
          votes_count: number
        }
        Insert: {
          category?: string | null
          clinic_id?: string | null
          comments_count?: number
          created_at?: string
          description: string
          error_log?: string | null
          id?: string
          item_number?: number
          page_url?: string | null
          priority?: string | null
          reported_by?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          resolved_at?: string | null
          route_path?: string | null
          screenshots?: string[] | null
          status?: string
          title: string
          type: string
          updated_at?: string
          votes_count?: number
        }
        Update: {
          category?: string | null
          clinic_id?: string | null
          comments_count?: number
          created_at?: string
          description?: string
          error_log?: string | null
          id?: string
          item_number?: number
          page_url?: string | null
          priority?: string | null
          reported_by?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          resolved_at?: string | null
          route_path?: string | null
          screenshots?: string[] | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          votes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "feedback_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_payments: {
        Row: {
          amount: number
          appointment_id: string | null
          card_brand: string | null
          card_last_4: string | null
          charge_id: string | null
          check_number: string | null
          clinic_id: string | null
          created_at: string | null
          created_by: string | null
          foreign_id: string | null
          foreign_id_type: string | null
          id: string
          insurance_plan_id: string | null
          is_refund: boolean | null
          metadata: Json | null
          nexhealth_id: number | null
          nexhealth_synced_at: string | null
          notes: string | null
          original_payment_id: string | null
          patient_id: string | null
          payment_date: string
          payment_method: string | null
          payment_source: string | null
          payment_type: string
          processed_at: string | null
          reference_number: string | null
          refund_reason: string | null
          refunded_amount: number | null
          status: string | null
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          appointment_id?: string | null
          card_brand?: string | null
          card_last_4?: string | null
          charge_id?: string | null
          check_number?: string | null
          clinic_id?: string | null
          created_at?: string | null
          created_by?: string | null
          foreign_id?: string | null
          foreign_id_type?: string | null
          id?: string
          insurance_plan_id?: string | null
          is_refund?: boolean | null
          metadata?: Json | null
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          notes?: string | null
          original_payment_id?: string | null
          patient_id?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_source?: string | null
          payment_type?: string
          processed_at?: string | null
          reference_number?: string | null
          refund_reason?: string | null
          refunded_amount?: number | null
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          card_brand?: string | null
          card_last_4?: string | null
          charge_id?: string | null
          check_number?: string | null
          clinic_id?: string | null
          created_at?: string | null
          created_by?: string | null
          foreign_id?: string | null
          foreign_id_type?: string | null
          id?: string
          insurance_plan_id?: string | null
          is_refund?: boolean | null
          metadata?: Json | null
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          notes?: string | null
          original_payment_id?: string | null
          patient_id?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_source?: string | null
          payment_type?: string
          processed_at?: string | null
          reference_number?: string | null
          refund_reason?: string | null
          refunded_amount?: number | null
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_insurance_plan_id_fkey"
            columns: ["insurance_plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_original_payment_id_fkey"
            columns: ["original_payment_id"]
            isOneToOne: false
            referencedRelation: "financial_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
        ]
      }
      function_call_logs: {
        Row: {
          activity_log_id: string | null
          call_log_id: string | null
          clinic_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          execution_status: string
          execution_time_ms: number | null
          function_arguments: Json
          function_name: string
          function_result: Json | null
          id: string
          metadata: Json | null
          sequence_number: number
          started_at: string | null
        }
        Insert: {
          activity_log_id?: string | null
          call_log_id?: string | null
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_status: string
          execution_time_ms?: number | null
          function_arguments?: Json
          function_name: string
          function_result?: Json | null
          id?: string
          metadata?: Json | null
          sequence_number: number
          started_at?: string | null
        }
        Update: {
          activity_log_id?: string | null
          call_log_id?: string | null
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_status?: string
          execution_time_ms?: number | null
          function_arguments?: Json
          function_name?: string
          function_result?: Json | null
          id?: string
          metadata?: Json | null
          sequence_number?: number
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "function_call_logs_activity_log_id_fkey"
            columns: ["activity_log_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "function_call_logs_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "function_call_logs_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "v_call_workflow_status"
            referencedColumns: ["call_log_id"]
          },
          {
            foreignKeyName: "function_call_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      hipaa_audit_logs: {
        Row: {
          action_type: string
          clinic_id: string
          created_at: string
          description: string
          id: string
          ip_address: unknown
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          patient_id: string | null
          request_path: string | null
          resource_id: string | null
          resource_type: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          clinic_id: string
          created_at?: string
          description: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          patient_id?: string | null
          request_path?: string | null
          resource_id?: string | null
          resource_type?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          clinic_id?: string
          created_at?: string
          description?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          patient_id?: string | null
          request_path?: string | null
          resource_id?: string | null
          resource_type?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      hipaa_audit_reports: {
        Row: {
          clinic_id: string
          created_at: string
          date_range_end: string
          date_range_start: string
          file_url: string | null
          generated_by: string | null
          id: string
          metadata: Json | null
          report_type: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          date_range_end: string
          date_range_start: string
          file_url?: string | null
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          report_type: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          date_range_end?: string
          date_range_start?: string
          file_url?: string | null
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          report_type?: string
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          clinic_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          duplicate_count: number | null
          error_summary: string | null
          errors: Json | null
          failed_count: number
          file_name: string
          file_size: number | null
          id: string
          import_options: Json | null
          import_type: string
          started_at: string | null
          status: string | null
          success_count: number
          total_rows: number
        }
        Insert: {
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duplicate_count?: number | null
          error_summary?: string | null
          errors?: Json | null
          failed_count?: number
          file_name: string
          file_size?: number | null
          id?: string
          import_options?: Json | null
          import_type: string
          started_at?: string | null
          status?: string | null
          success_count?: number
          total_rows?: number
        }
        Update: {
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duplicate_count?: number | null
          error_summary?: string | null
          errors?: Json | null
          failed_count?: number
          file_name?: string
          file_size?: number | null
          id?: string
          import_options?: Json | null
          import_type?: string
          started_at?: string | null
          status?: string | null
          success_count?: number
          total_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_locations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          id: number
          institution_id: number
          is_default: boolean | null
          name: string
          phone_number: string | null
          state: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: number
          institution_id: number
          is_default?: boolean | null
          name: string
          phone_number?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: number
          institution_id?: number
          is_default?: boolean | null
          name?: string
          phone_number?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_locations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          appointment_types_location_scoped: boolean | null
          clinic_id: string | null
          country_code: string | null
          created_at: string | null
          emrs: string[] | null
          id: number
          is_active: boolean | null
          is_sync_notifications: boolean | null
          locations: Json | null
          name: string
          notify_insert_fails: boolean | null
          phone_number: string | null
          subdomain: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_types_location_scoped?: boolean | null
          clinic_id?: string | null
          country_code?: string | null
          created_at?: string | null
          emrs?: string[] | null
          id?: number
          is_active?: boolean | null
          is_sync_notifications?: boolean | null
          locations?: Json | null
          name: string
          notify_insert_fails?: boolean | null
          phone_number?: string | null
          subdomain?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_types_location_scoped?: boolean | null
          clinic_id?: string | null
          country_code?: string | null
          created_at?: string | null
          emrs?: string[] | null
          id?: number
          is_active?: boolean | null
          is_sync_notifications?: boolean | null
          locations?: Json | null
          name?: string
          notify_insert_fails?: boolean | null
          phone_number?: string | null
          subdomain?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institutions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_plans: {
        Row: {
          annual_benefit_used: number | null
          clinic_id: string | null
          copay_amount: number | null
          coverage_end_date: string | null
          coverage_start_date: string | null
          created_at: string | null
          deductible: number | null
          deductible_met: number | null
          foreign_id: string | null
          foreign_id_type: string | null
          group_number: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          max_annual_benefit: number | null
          member_id: string | null
          metadata: Json | null
          nexhealth_id: number | null
          nexhealth_synced_at: string | null
          patient_id: string | null
          payer_id: string | null
          payer_name: string | null
          plan_name: string
          plan_type: string | null
          subscriber_name: string | null
          subscriber_relationship: string | null
          updated_at: string | null
          verification_status: string | null
          verified_at: string | null
        }
        Insert: {
          annual_benefit_used?: number | null
          clinic_id?: string | null
          copay_amount?: number | null
          coverage_end_date?: string | null
          coverage_start_date?: string | null
          created_at?: string | null
          deductible?: number | null
          deductible_met?: number | null
          foreign_id?: string | null
          foreign_id_type?: string | null
          group_number?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          max_annual_benefit?: number | null
          member_id?: string | null
          metadata?: Json | null
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          patient_id?: string | null
          payer_id?: string | null
          payer_name?: string | null
          plan_name: string
          plan_type?: string | null
          subscriber_name?: string | null
          subscriber_relationship?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verified_at?: string | null
        }
        Update: {
          annual_benefit_used?: number | null
          clinic_id?: string | null
          copay_amount?: number | null
          coverage_end_date?: string | null
          coverage_start_date?: string | null
          created_at?: string | null
          deductible?: number | null
          deductible_met?: number | null
          foreign_id?: string | null
          foreign_id_type?: string | null
          group_number?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          max_annual_benefit?: number | null
          member_id?: string | null
          metadata?: Json | null
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          patient_id?: string | null
          payer_id?: string | null
          payer_name?: string | null
          plan_name?: string
          plan_type?: string | null
          subscriber_name?: string | null
          subscriber_relationship?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_plans_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          id: string
          integration_name: string
          is_enabled: boolean | null
          last_test_status: string | null
          last_tested_at: string | null
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          integration_name: string
          is_enabled?: boolean | null
          last_test_status?: string | null
          last_tested_at?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          integration_name?: string
          is_enabled?: boolean | null
          last_test_status?: string | null
          last_tested_at?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      kiosk_sessions: {
        Row: {
          appointment_id: string | null
          check_in_time: string | null
          check_out_time: string | null
          clinic_id: string | null
          consent_signed: boolean | null
          created_at: string | null
          expires_at: string | null
          forms_completed: Json | null
          id: string
          insurance_verification_details: Json | null
          insurance_verification_status: string | null
          insurance_verified: boolean | null
          medical_history_completed: boolean | null
          opened_at: string | null
          patient_id: string | null
          payment_collected: number | null
          payment_method: string | null
          payment_reference: string | null
          sent_at: string | null
          sent_by: string | null
          sent_via: string | null
          session_type: string
          signature_data: string | null
          status: string | null
          token: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          clinic_id?: string | null
          consent_signed?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          forms_completed?: Json | null
          id?: string
          insurance_verification_details?: Json | null
          insurance_verification_status?: string | null
          insurance_verified?: boolean | null
          medical_history_completed?: boolean | null
          opened_at?: string | null
          patient_id?: string | null
          payment_collected?: number | null
          payment_method?: string | null
          payment_reference?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sent_via?: string | null
          session_type: string
          signature_data?: string | null
          status?: string | null
          token?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          clinic_id?: string | null
          consent_signed?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          forms_completed?: Json | null
          id?: string
          insurance_verification_details?: Json | null
          insurance_verification_status?: string | null
          insurance_verified?: boolean | null
          medical_history_completed?: boolean | null
          opened_at?: string | null
          patient_id?: string | null
          payment_collected?: number | null
          payment_method?: string | null
          payment_reference?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sent_via?: string | null
          session_type?: string
          signature_data?: string | null
          status?: string | null
          token?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiosk_sessions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiosk_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiosk_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          appointment_id: string | null
          assigned_to: string | null
          auto_call_enabled: boolean | null
          clinic_id: string | null
          created_at: string | null
          email: string | null
          first_name: string
          follow_up_count: number | null
          id: string
          last_auto_action: string | null
          last_contacted_at: string | null
          last_name: string
          metadata: Json | null
          next_follow_up_at: string | null
          notes: string | null
          patient_id: string | null
          phone: string | null
          priority: string
          source: string
          status: string
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          assigned_to?: string | null
          auto_call_enabled?: boolean | null
          clinic_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name: string
          follow_up_count?: number | null
          id?: string
          last_auto_action?: string | null
          last_contacted_at?: string | null
          last_name: string
          metadata?: Json | null
          next_follow_up_at?: string | null
          notes?: string | null
          patient_id?: string | null
          phone?: string | null
          priority?: string
          source?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          assigned_to?: string | null
          auto_call_enabled?: boolean | null
          clinic_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          follow_up_count?: number | null
          id?: string
          last_auto_action?: string | null
          last_contacted_at?: string | null
          last_name?: string
          metadata?: Json | null
          next_follow_up_at?: string | null
          notes?: string | null
          patient_id?: string | null
          phone?: string | null
          priority?: string
          source?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_publications: {
        Row: {
          api_key: string | null
          category: string | null
          created_at: string | null
          description: string | null
          display_name: string
          external_marketplace_id: string | null
          features: Json | null
          id: string
          manifest_data: Json
          module_slug: string
          module_version: string
          published_at: string | null
          published_by: string | null
          status: string | null
          tech_tags: Json | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          external_marketplace_id?: string | null
          features?: Json | null
          id?: string
          manifest_data?: Json
          module_slug: string
          module_version: string
          published_at?: string | null
          published_by?: string | null
          status?: string | null
          tech_tags?: Json | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          external_marketplace_id?: string | null
          features?: Json | null
          id?: string
          manifest_data?: Json
          module_slug?: string
          module_version?: string
          published_at?: string | null
          published_by?: string | null
          status?: string | null
          tech_tags?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      module_change_logs: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          module_id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          module_id: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          module_id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "module_change_logs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "platform_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      operatories: {
        Row: {
          appointment_types: Json | null
          appt_categories: Json | null
          capacity: number | null
          created_at: string | null
          description: string | null
          foreign_id: string | null
          id: number
          institution_id: number
          is_active: boolean | null
          is_bookable: boolean | null
          location_id: number | null
          metadata: Json | null
          name: string
          operatory_type: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_types?: Json | null
          appt_categories?: Json | null
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          foreign_id?: string | null
          id?: number
          institution_id: number
          is_active?: boolean | null
          is_bookable?: boolean | null
          location_id?: number | null
          metadata?: Json | null
          name: string
          operatory_type?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_types?: Json | null
          appt_categories?: Json | null
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          foreign_id?: string | null
          id?: number
          institution_id?: number
          is_active?: boolean | null
          is_bookable?: boolean | null
          location_id?: number | null
          metadata?: Json | null
          name?: string
          operatory_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operatories_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operatories_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "institution_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_agent_settings: {
        Row: {
          agent_type: string
          clinic_id: string | null
          created_at: string | null
          elevenlabs_agent_id: string | null
          id: string
          is_enabled: boolean | null
          max_attempts: number | null
          max_items_per_run: number | null
          retry_interval_hours: Json | null
          settings: Json | null
          updated_at: string | null
          working_days: number[] | null
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          agent_type: string
          clinic_id?: string | null
          created_at?: string | null
          elevenlabs_agent_id?: string | null
          id?: string
          is_enabled?: boolean | null
          max_attempts?: number | null
          max_items_per_run?: number | null
          retry_interval_hours?: Json | null
          settings?: Json | null
          updated_at?: string | null
          working_days?: number[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          agent_type?: string
          clinic_id?: string | null
          created_at?: string | null
          elevenlabs_agent_id?: string | null
          id?: string
          is_enabled?: boolean | null
          max_attempts?: number | null
          max_items_per_run?: number | null
          retry_interval_hours?: Json | null
          settings?: Json | null
          updated_at?: string | null
          working_days?: number[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_agent_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_call_queue: {
        Row: {
          amount_due: number | null
          attempt_count: number | null
          call_log_id: string | null
          call_sid: string | null
          call_type: string
          campaign_id: string | null
          clinic_id: string | null
          contact_name: string | null
          created_at: string | null
          id: string
          last_attempt_at: string | null
          lead_id: string | null
          max_attempts: number | null
          metadata: Json | null
          next_attempt_at: string | null
          outcome: string | null
          outcome_notes: string | null
          patient_id: string | null
          phone_number: string
          priority: number | null
          recording_url: string | null
          status: string
          transcript: string | null
          updated_at: string | null
        }
        Insert: {
          amount_due?: number | null
          attempt_count?: number | null
          call_log_id?: string | null
          call_sid?: string | null
          call_type?: string
          campaign_id?: string | null
          clinic_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          last_attempt_at?: string | null
          lead_id?: string | null
          max_attempts?: number | null
          metadata?: Json | null
          next_attempt_at?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          patient_id?: string | null
          phone_number: string
          priority?: number | null
          recording_url?: string | null
          status?: string
          transcript?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_due?: number | null
          attempt_count?: number | null
          call_log_id?: string | null
          call_sid?: string | null
          call_type?: string
          campaign_id?: string | null
          clinic_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          last_attempt_at?: string | null
          lead_id?: string | null
          max_attempts?: number | null
          metadata?: Json | null
          next_attempt_at?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          patient_id?: string | null
          phone_number?: string
          priority?: number | null
          recording_url?: string | null
          status?: string
          transcript?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_call_queue_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_call_queue_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "v_call_workflow_status"
            referencedColumns: ["call_log_id"]
          },
          {
            foreignKeyName: "outbound_call_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outbound_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_call_queue_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_call_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_call_queue_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_call_queue_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_campaigns: {
        Row: {
          campaign_type: string
          clinic_id: string | null
          completed_at: string | null
          contacted_count: number | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          settings: Json | null
          started_at: string | null
          status: string
          success_count: number | null
          target_count: number | null
          updated_at: string | null
        }
        Insert: {
          campaign_type?: string
          clinic_id?: string | null
          completed_at?: string | null
          contacted_count?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          settings?: Json | null
          started_at?: string | null
          status?: string
          success_count?: number | null
          target_count?: number | null
          updated_at?: string | null
        }
        Update: {
          campaign_type?: string
          clinic_id?: string | null
          completed_at?: string | null
          contacted_count?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          settings?: Json | null
          started_at?: string | null
          status?: string
          success_count?: number | null
          target_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_campaigns_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      page_permissions: {
        Row: {
          can_access: boolean | null
          created_at: string | null
          id: string
          page_name: string
          page_path: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          can_access?: boolean | null
          created_at?: string | null
          id?: string
          page_name: string
          page_path: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          can_access?: boolean | null
          created_at?: string | null
          id?: string
          page_name?: string
          page_path?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      patient_alerts: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          created_by: string | null
          disabled_at: string | null
          disabled_by: string | null
          id: number
          is_active: boolean | null
          nexhealth_id: number | null
          nexhealth_synced_at: string | null
          note: string
          patient_id: string
          severity: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          created_by?: string | null
          disabled_at?: string | null
          disabled_by?: string | null
          id?: number
          is_active?: boolean | null
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          note: string
          patient_id: string
          severity?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          created_by?: string | null
          disabled_at?: string | null
          disabled_by?: string | null
          id?: number
          is_active?: boolean | null
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          note?: string
          patient_id?: string
          severity?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_alerts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          document_type_id: number | null
          file_size: number | null
          file_type: string | null
          file_url: string
          filename: string
          id: number
          nexhealth_id: number | null
          nexhealth_synced_at: string | null
          nexhealth_url: string | null
          notes: string | null
          patient_id: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          document_type_id?: number | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          filename: string
          id?: number
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          nexhealth_url?: string | null
          notes?: string | null
          patient_id: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          document_type_id?: number | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          filename?: string
          id?: number
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          nexhealth_url?: string | null
          notes?: string | null
          patient_id?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_recalls: {
        Row: {
          appointment_id: string | null
          clinic_id: string | null
          created_at: string | null
          date_due: string
          foreign_id: string | null
          foreign_id_type: string | null
          id: number
          nexhealth_id: number | null
          nexhealth_synced_at: string | null
          notes: string | null
          patient_id: string
          recall_type_id: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          date_due: string
          foreign_id?: string | null
          foreign_id_type?: string | null
          id?: number
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          notes?: string | null
          patient_id: string
          recall_type_id?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          date_due?: string
          foreign_id?: string | null
          foreign_id_type?: string | null
          id?: number
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          notes?: string | null
          patient_id?: string
          recall_type_id?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_recalls_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_recalls_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_recalls_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_recalls_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_recalls_recall_type_id_fkey"
            columns: ["recall_type_id"]
            isOneToOne: false
            referencedRelation: "recall_types"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          address_line_1: string | null
          address_line_2: string | null
          allergies: string | null
          bio_json: Json | null
          cell_phone_number: string | null
          city: string | null
          clinic_id: string | null
          copay_amount: number | null
          created_at: string | null
          custom_contact_number: string | null
          dob: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string
          gender: string | null
          height: number | null
          home_phone_number: string | null
          id: string
          insurance_group: string | null
          insurance_id: string | null
          insurance_provider: string | null
          is_active: boolean | null
          is_seeded: boolean
          last_name: string
          medical_history: string | null
          medications: string | null
          nexhealth_patient_id: string | null
          nexhealth_sync_status: string | null
          nexhealth_synced_at: string | null
          no_show_count: number | null
          notes: string | null
          phone: string
          previous_balance: number | null
          race: string | null
          risk_score: number | null
          seed_batch_id: string | null
          source: string | null
          ssn: string | null
          state: string | null
          total_appointments: number | null
          updated_at: string | null
          weight: number | null
          work_phone_number: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          allergies?: string | null
          bio_json?: Json | null
          cell_phone_number?: string | null
          city?: string | null
          clinic_id?: string | null
          copay_amount?: number | null
          created_at?: string | null
          custom_contact_number?: string | null
          dob: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name: string
          gender?: string | null
          height?: number | null
          home_phone_number?: string | null
          id?: string
          insurance_group?: string | null
          insurance_id?: string | null
          insurance_provider?: string | null
          is_active?: boolean | null
          is_seeded?: boolean
          last_name: string
          medical_history?: string | null
          medications?: string | null
          nexhealth_patient_id?: string | null
          nexhealth_sync_status?: string | null
          nexhealth_synced_at?: string | null
          no_show_count?: number | null
          notes?: string | null
          phone: string
          previous_balance?: number | null
          race?: string | null
          risk_score?: number | null
          seed_batch_id?: string | null
          source?: string | null
          ssn?: string | null
          state?: string | null
          total_appointments?: number | null
          updated_at?: string | null
          weight?: number | null
          work_phone_number?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          allergies?: string | null
          bio_json?: Json | null
          cell_phone_number?: string | null
          city?: string | null
          clinic_id?: string | null
          copay_amount?: number | null
          created_at?: string | null
          custom_contact_number?: string | null
          dob?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string
          gender?: string | null
          height?: number | null
          home_phone_number?: string | null
          id?: string
          insurance_group?: string | null
          insurance_id?: string | null
          insurance_provider?: string | null
          is_active?: boolean | null
          is_seeded?: boolean
          last_name?: string
          medical_history?: string | null
          medications?: string | null
          nexhealth_patient_id?: string | null
          nexhealth_sync_status?: string | null
          nexhealth_synced_at?: string | null
          no_show_count?: number | null
          notes?: string | null
          phone?: string
          previous_balance?: number | null
          race?: string | null
          risk_score?: number | null
          seed_batch_id?: string | null
          source?: string | null
          ssn?: string | null
          state?: string | null
          total_appointments?: number | null
          updated_at?: string | null
          weight?: number | null
          work_phone_number?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_seed_batch_id_fkey"
            columns: ["seed_batch_id"]
            isOneToOne: false
            referencedRelation: "seed_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      payer_configurations: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          payer_name: string
          payer_type: string | null
          requires_npi: boolean | null
          requires_tax_id: boolean | null
          stedi_payer_id: string
          updated_at: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          payer_name: string
          payer_type?: string | null
          requires_npi?: boolean | null
          requires_tax_id?: boolean | null
          stedi_payer_id: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          payer_name?: string
          payer_type?: string | null
          requires_npi?: boolean | null
          requires_tax_id?: boolean | null
          stedi_payer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payer_configurations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_collection_tasks: {
        Row: {
          aging_bucket: string | null
          amount_collected: number | null
          amount_due: number
          assigned_to: string | null
          auto_collection_enabled: boolean | null
          charge_ids: string[] | null
          clinic_id: string | null
          contact_attempts: number | null
          created_at: string | null
          days_overdue: number | null
          id: string
          last_auto_action: string | null
          last_contact_method: string | null
          last_contacted_at: string | null
          next_contact_at: string | null
          notes: string | null
          patient_id: string | null
          patient_name: string | null
          patient_phone: string | null
          payment_plan: Json | null
          priority: string
          status: string
          updated_at: string | null
        }
        Insert: {
          aging_bucket?: string | null
          amount_collected?: number | null
          amount_due?: number
          assigned_to?: string | null
          auto_collection_enabled?: boolean | null
          charge_ids?: string[] | null
          clinic_id?: string | null
          contact_attempts?: number | null
          created_at?: string | null
          days_overdue?: number | null
          id?: string
          last_auto_action?: string | null
          last_contact_method?: string | null
          last_contacted_at?: string | null
          next_contact_at?: string | null
          notes?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          payment_plan?: Json | null
          priority?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          aging_bucket?: string | null
          amount_collected?: number | null
          amount_due?: number
          assigned_to?: string | null
          auto_collection_enabled?: boolean | null
          charge_ids?: string[] | null
          clinic_id?: string | null
          contact_attempts?: number | null
          created_at?: string | null
          days_overdue?: number | null
          id?: string
          last_auto_action?: string | null
          last_contact_method?: string | null
          last_contacted_at?: string | null
          next_contact_at?: string | null
          notes?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          payment_plan?: Json | null
          priority?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_collection_tasks_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_collection_tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_collection_tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_modules: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_critical: boolean
          is_enabled: boolean
          name: string
          parent_id: string | null
          route_path: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_critical?: boolean
          is_enabled?: boolean
          name: string
          parent_id?: string | null
          route_path: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_critical?: boolean
          is_enabled?: boolean
          name?: string
          parent_id?: string | null
          route_path?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_modules_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "platform_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          appointment_id: string | null
          body_site: Json | null
          claim_id: string | null
          clinic_id: string | null
          code: string
          created_at: string | null
          description: string | null
          end_date: string | null
          fee: Json | null
          foreign_id: string | null
          foreign_id_type: string | null
          id: string
          institution_id: number | null
          metadata: Json | null
          name: string
          notes: string | null
          operatory_id: number | null
          patient_id: string | null
          provider_id: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          body_site?: Json | null
          claim_id?: string | null
          clinic_id?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          fee?: Json | null
          foreign_id?: string | null
          foreign_id_type?: string | null
          id?: string
          institution_id?: number | null
          metadata?: Json | null
          name: string
          notes?: string | null
          operatory_id?: number | null
          patient_id?: string | null
          provider_id?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          body_site?: Json | null
          claim_id?: string | null
          clinic_id?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          fee?: Json | null
          foreign_id?: string | null
          foreign_id_type?: string | null
          id?: string
          institution_id?: number | null
          metadata?: Json | null
          name?: string
          notes?: string | null
          operatory_id?: number | null
          patient_id?: string | null
          provider_id?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedures_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_operatory_id_fkey"
            columns: ["operatory_id"]
            isOneToOne: false
            referencedRelation: "operatories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          first_name: string
          full_name: string | null
          id: string
          is_active: boolean
          is_over_18: boolean
          last_login_at: string | null
          last_name: string
          password_changed_at: string | null
          phone: string
          rejection_reason: string | null
          requested_role: string | null
          state: string | null
          street_address: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          first_name?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          is_over_18?: boolean
          last_login_at?: string | null
          last_name?: string
          password_changed_at?: string | null
          phone?: string
          rejection_reason?: string | null
          requested_role?: string | null
          state?: string | null
          street_address?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          first_name?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_over_18?: boolean
          last_login_at?: string | null
          last_name?: string
          password_changed_at?: string | null
          phone?: string
          rejection_reason?: string | null
          requested_role?: string | null
          state?: string | null
          street_address?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      provider_availabilities: {
        Row: {
          appointment_type_ids: string[] | null
          buffer_minutes: number | null
          clinic_id: string | null
          created_at: string | null
          day_of_week: number
          effective_from: string | null
          effective_until: string | null
          end_time: string
          foreign_id: string | null
          foreign_id_type: string | null
          id: string
          is_active: boolean | null
          location_id: number | null
          nexhealth_synced_at: string | null
          operatory_id: number | null
          provider_id: string
          slot_duration_minutes: number | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          appointment_type_ids?: string[] | null
          buffer_minutes?: number | null
          clinic_id?: string | null
          created_at?: string | null
          day_of_week: number
          effective_from?: string | null
          effective_until?: string | null
          end_time: string
          foreign_id?: string | null
          foreign_id_type?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: number | null
          nexhealth_synced_at?: string | null
          operatory_id?: number | null
          provider_id: string
          slot_duration_minutes?: number | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          appointment_type_ids?: string[] | null
          buffer_minutes?: number | null
          clinic_id?: string | null
          created_at?: string | null
          day_of_week?: number
          effective_from?: string | null
          effective_until?: string | null
          end_time?: string
          foreign_id?: string | null
          foreign_id_type?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: number | null
          nexhealth_synced_at?: string | null
          operatory_id?: number | null
          provider_id?: string
          slot_duration_minutes?: number | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_availabilities_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "institution_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_availabilities_operatory_id_fkey"
            columns: ["operatory_id"]
            isOneToOne: false
            referencedRelation: "operatories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_availabilities_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_availability_exceptions: {
        Row: {
          created_at: string | null
          end_time: string | null
          exception_date: string
          id: string
          is_available: boolean | null
          provider_id: string | null
          reason: string | null
          start_time: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          exception_date: string
          id?: string
          is_available?: boolean | null
          provider_id?: string | null
          reason?: string | null
          start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          exception_date?: string
          id?: string
          is_available?: boolean | null
          provider_id?: string | null
          reason?: string | null
          start_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_availability_exceptions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_availability_overrides: {
        Row: {
          created_at: string | null
          end_time: string | null
          id: string
          location_id: number | null
          operatory_id: number | null
          override_date: string
          override_type: string
          provider_id: string
          reason: string | null
          start_time: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          location_id?: number | null
          operatory_id?: number | null
          override_date: string
          override_type: string
          provider_id: string
          reason?: string | null
          start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          location_id?: number | null
          operatory_id?: number | null
          override_date?: string
          override_type?: string
          provider_id?: string
          reason?: string | null
          start_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_availability_overrides_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "institution_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_availability_overrides_operatory_id_fkey"
            columns: ["operatory_id"]
            isOneToOne: false
            referencedRelation: "operatories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_availability_overrides_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          availabilities: Json | null
          bio: Json | null
          buffer_time: number | null
          clinic_id: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          foreign_id: string | null
          foreign_id_type: string | null
          google_calendar_id: string | null
          google_refresh_token: string | null
          google_sync_enabled: boolean | null
          id: string
          inactive: boolean | null
          institution_id: number | null
          is_active: boolean | null
          last_name: string | null
          last_sync_time: string | null
          last_synced_at: string | null
          locations: Json | null
          middle_name: string | null
          name: string
          npi: string | null
          phone: string | null
          provider_requestables: Json | null
          scheduling: Json | null
          slot_duration: number | null
          specialty: string | null
          updated_at: string | null
          user_id: string | null
          working_hours: Json | null
        }
        Insert: {
          availabilities?: Json | null
          bio?: Json | null
          buffer_time?: number | null
          clinic_id?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          foreign_id?: string | null
          foreign_id_type?: string | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          google_sync_enabled?: boolean | null
          id?: string
          inactive?: boolean | null
          institution_id?: number | null
          is_active?: boolean | null
          last_name?: string | null
          last_sync_time?: string | null
          last_synced_at?: string | null
          locations?: Json | null
          middle_name?: string | null
          name: string
          npi?: string | null
          phone?: string | null
          provider_requestables?: Json | null
          scheduling?: Json | null
          slot_duration?: number | null
          specialty?: string | null
          updated_at?: string | null
          user_id?: string | null
          working_hours?: Json | null
        }
        Update: {
          availabilities?: Json | null
          bio?: Json | null
          buffer_time?: number | null
          clinic_id?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          foreign_id?: string | null
          foreign_id_type?: string | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          google_sync_enabled?: boolean | null
          id?: string
          inactive?: boolean | null
          institution_id?: number | null
          is_active?: boolean | null
          last_name?: string | null
          last_sync_time?: string | null
          last_synced_at?: string | null
          locations?: Json | null
          middle_name?: string | null
          name?: string
          npi?: string | null
          phone?: string | null
          provider_requestables?: Json | null
          scheduling?: Json | null
          slot_duration?: number | null
          specialty?: string | null
          updated_at?: string | null
          user_id?: string | null
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      recall_types: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          description: string | null
          foreign_id: string | null
          foreign_id_type: string | null
          id: number
          interval_num: number | null
          interval_unit: string | null
          is_active: boolean | null
          location_id: number | null
          name: string
          nexhealth_id: number | null
          nexhealth_synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          description?: string | null
          foreign_id?: string | null
          foreign_id_type?: string | null
          id?: number
          interval_num?: number | null
          interval_unit?: string | null
          is_active?: boolean | null
          location_id?: number | null
          name: string
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          description?: string | null
          foreign_id?: string | null
          foreign_id_type?: string | null
          id?: number
          interval_num?: number | null
          interval_unit?: string | null
          is_active?: boolean | null
          location_id?: number | null
          name?: string
          nexhealth_id?: number | null
          nexhealth_synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recall_types_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_types_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "institution_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          appointment_id: string | null
          clinic_id: string | null
          created_at: string | null
          id: string
          is_seeded: boolean
          patient_id: string | null
          reminder_type: string
          response: string | null
          scheduled_at: string
          seed_batch_id: string | null
          sent_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          is_seeded?: boolean
          patient_id?: string | null
          reminder_type: string
          response?: string | null
          scheduled_at: string
          seed_batch_id?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          is_seeded?: boolean
          patient_id?: string | null
          reminder_type?: string
          response?: string | null
          scheduled_at?: string
          seed_batch_id?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_seed_batch_id_fkey"
            columns: ["seed_batch_id"]
            isOneToOne: false
            referencedRelation: "seed_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      seed_batches: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          module_name: string
          record_count: number | null
          time_range: string
          volume: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          module_name: string
          record_count?: number | null
          time_range: string
          volume: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          module_name?: string
          record_count?: number | null
          time_range?: string
          volume?: string
        }
        Relationships: [
          {
            foreignKeyName: "seed_batches_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      seed_data_settings: {
        Row: {
          clinic_id: string | null
          id: string
          show_seeded_data: boolean | null
        }
        Insert: {
          clinic_id?: string | null
          id?: string
          show_seeded_data?: boolean | null
        }
        Update: {
          clinic_id?: string | null
          id?: string
          show_seeded_data?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "seed_data_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          clinic_id: string | null
          created_at: string
          error_message: string | null
          id: string
          message_sid: string | null
          message_type: string
          patient_id: string | null
          phone_number: string
          sent_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_sid?: string | null
          message_type: string
          patient_id?: string | null
          phone_number: string
          sent_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_sid?: string | null
          message_type?: string
          patient_id?: string | null
          phone_number?: string
          sent_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients_with_invalid_phones"
            referencedColumns: ["id"]
          },
        ]
      }
      system_notifications: {
        Row: {
          category: string | null
          clinic_id: string | null
          created_at: string | null
          created_by: string | null
          id: number
          is_dismissed: boolean | null
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          clinic_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: number
          is_dismissed?: boolean | null
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          clinic_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: number
          is_dismissed?: boolean | null
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_notifications_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_page_permissions: {
        Row: {
          can_access: boolean | null
          created_at: string | null
          id: string
          page_path: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_access?: boolean | null
          created_at?: string | null
          id?: string
          page_path: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_access?: boolean | null
          created_at?: string | null
          id?: string
          page_path?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          clinic_id: string | null
          created_at: string
          id: string
          is_primary: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      patients_with_invalid_phones: {
        Row: {
          created_at: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_call_workflow_status: {
        Row: {
          ai_provider: string | null
          appointment_booked: boolean | null
          call_log_id: string | null
          call_sid: string | null
          call_status: string | null
          completed_activities: number | null
          failed_activities: number | null
          insurance_verified: boolean | null
          last_activity_at: string | null
          outcome_details: Json | null
          patient_validated: boolean | null
          total_activities: number | null
          workflow_status: Json | null
        }
        Relationships: []
      }
      v_elevenlabs_conversation_analytics: {
        Row: {
          activity_count: number | null
          agent_id: string | null
          appointment_booked: boolean | null
          avg_activity_duration_ms: number | null
          conversation_duration_ms: number | null
          conversation_id: string | null
          duration: number | null
          ended_at: string | null
          id: string | null
          insurance_verified: boolean | null
          message_count: number | null
          patient_validated: boolean | null
          started_at: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_page: {
        Args: { _page_path: string; _user_id: string }
        Returns: boolean
      }
      cleanup_expired_password_reset_tokens: { Args: never; Returns: undefined }
      complete_agent_activity: {
        Args: {
          p_activity_id: string
          p_activity_status: string
          p_error_message?: string
          p_function_result?: Json
          p_output_data?: Json
        }
        Returns: undefined
      }
      generate_confirmation_code: { Args: never; Returns: string }
      get_call_workflow_progress: {
        Args: { p_call_log_id: string }
        Returns: Json
      }
      get_user_clinic_id: { Args: { _user_id: string }; Returns: string }
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          page_name: string
          page_path: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_agent_activity: {
        Args: {
          p_activity_name: string
          p_activity_status: string
          p_activity_type: string
          p_call_log_id: string
          p_clinic_id: string
          p_function_arguments?: Json
          p_function_name?: string
          p_input_data?: Json
        }
        Returns: string
      }
      log_hipaa_event: {
        Args: {
          p_action_type: string
          p_clinic_id: string
          p_description: string
          p_ip_address?: string
          p_metadata?: Json
          p_new_values?: Json
          p_old_values?: Json
          p_patient_id: string
          p_request_path?: string
          p_resource_id: string
          p_resource_type: string
          p_severity: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      release_expired_slot_holds: { Args: never; Returns: number }
      user_belongs_to_clinic: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "public_user"
        | "member"
        | "secretary"
        | "area_rep"
        | "admin"
        | "super_admin"
        | "provider"
        | "staff"
        | "billing"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "public_user",
        "member",
        "secretary",
        "area_rep",
        "admin",
        "super_admin",
        "provider",
        "staff",
        "billing",
      ],
    },
  },
} as const
