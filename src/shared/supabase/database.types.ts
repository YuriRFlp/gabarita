
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ai_requests": {
                  Row: {
                    "created_at": string,"id": string,"imported_at": string | null,"mode": Database["public"]['Enums']["ai_mode"],"prompt": string,"raw_response": string | null,"reference": Json | null,"status": Database["public"]['Enums']["ai_request_status"],"type": Database["public"]['Enums']["ai_request_type"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"imported_at"?: string | null,"mode": Database["public"]['Enums']["ai_mode"],"prompt": string,"raw_response"?: string | null,"reference"?: Json | null,"status"?: Database["public"]['Enums']["ai_request_status"],"type": Database["public"]['Enums']["ai_request_type"],"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"imported_at"?: string | null,"mode"?: Database["public"]['Enums']["ai_mode"],"prompt"?: string,"raw_response"?: string | null,"reference"?: Json | null,"status"?: Database["public"]['Enums']["ai_request_status"],"type"?: Database["public"]['Enums']["ai_request_type"],"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"answers": {
                  Row: {
                    "answer": string | null,"answered_at": string,"confidence": Database["public"]['Enums']["confidence_level"] | null,"correct": boolean | null,"id": string,"mock_exam_id": string | null,"question_id": string,"session_id": string | null,"time_sec": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer"?: string | null,"answered_at"?: string,"confidence"?: Database["public"]['Enums']["confidence_level"] | null,"correct"?: boolean | null,"id"?: string,"mock_exam_id"?: string | null,"question_id": string,"session_id"?: string | null,"time_sec"?: number | null,"user_id"?: string
                  }
                  Update: {
                    "answer"?: string | null,"answered_at"?: string,"confidence"?: Database["public"]['Enums']["confidence_level"] | null,"correct"?: boolean | null,"id"?: string,"mock_exam_id"?: string | null,"question_id"?: string,"session_id"?: string | null,"time_sec"?: number | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "answers_mock_exam_id_fkey"
      columns: ["mock_exam_id"]
isOneToOne: false
      referencedRelation: "mock_exams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "answers_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "answers_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "study_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"cards": {
                  Row: {
                    "back": string | null,"created_at": string,"difficulty": number,"due": string,"elapsed_days": number,"front": string | null,"id": string,"lapses": number,"last_review": string | null,"learning_steps": number,"question_id": string | null,"reps": number,"scheduled_days": number,"source": Database["public"]['Enums']["content_source"],"stability": number,"state": number,"subtopic_id": string | null,"suspended": boolean,"type": Database["public"]['Enums']["card_type"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "back"?: string | null,"created_at"?: string,"difficulty"?: number,"due"?: string,"elapsed_days"?: number,"front"?: string | null,"id"?: string,"lapses"?: number,"last_review"?: string | null,"learning_steps"?: number,"question_id"?: string | null,"reps"?: number,"scheduled_days"?: number,"source": Database["public"]['Enums']["content_source"],"stability"?: number,"state"?: number,"subtopic_id"?: string | null,"suspended"?: boolean,"type": Database["public"]['Enums']["card_type"],"user_id"?: string
                  }
                  Update: {
                    "back"?: string | null,"created_at"?: string,"difficulty"?: number,"due"?: string,"elapsed_days"?: number,"front"?: string | null,"id"?: string,"lapses"?: number,"last_review"?: string | null,"learning_steps"?: number,"question_id"?: string | null,"reps"?: number,"scheduled_days"?: number,"source"?: Database["public"]['Enums']["content_source"],"stability"?: number,"state"?: number,"subtopic_id"?: string | null,"suspended"?: boolean,"type"?: Database["public"]['Enums']["card_type"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cards_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cards_subtopic_id_fkey"
      columns: ["subtopic_id"]
isOneToOne: false
      referencedRelation: "subtopics"
      referencedColumns: ["id"]
    }
                  ]
                },"essay_prompts": {
                  Row: {
                    "created_at": string,"exam_board_id": string | null,"id": string,"model_answer_md": string | null,"source": Database["public"]['Enums']["content_source"],"statement": string,"support_texts": Json | null,"title": string,"topic_id": string | null,"type": Database["public"]['Enums']["essay_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"exam_board_id"?: string | null,"id"?: string,"model_answer_md"?: string | null,"source": Database["public"]['Enums']["content_source"],"statement": string,"support_texts"?: Json | null,"title": string,"topic_id"?: string | null,"type": Database["public"]['Enums']["essay_type"]
                  }
                  Update: {
                    "created_at"?: string,"exam_board_id"?: string | null,"id"?: string,"model_answer_md"?: string | null,"source"?: Database["public"]['Enums']["content_source"],"statement"?: string,"support_texts"?: Json | null,"title"?: string,"topic_id"?: string | null,"type"?: Database["public"]['Enums']["essay_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "essay_prompts_exam_board_id_fkey"
      columns: ["exam_board_id"]
isOneToOne: false
      referencedRelation: "exam_boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "essay_prompts_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "essay_prompts_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "v_topic_priority"
      referencedColumns: ["topic_id"]
    }
                  ]
                },"essays": {
                  Row: {
                    "feedback_md": string | null,"graded_at": string | null,"id": string,"lines": number,"prompt_id": string,"rubric_id": string,"scores": Json | null,"text": string,"time_sec": number | null,"total_score": number | null,"user_id": string,"written_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "feedback_md"?: string | null,"graded_at"?: string | null,"id"?: string,"lines": number,"prompt_id": string,"rubric_id": string,"scores"?: Json | null,"text": string,"time_sec"?: number | null,"total_score"?: number | null,"user_id"?: string,"written_at"?: string
                  }
                  Update: {
                    "feedback_md"?: string | null,"graded_at"?: string | null,"id"?: string,"lines"?: number,"prompt_id"?: string,"rubric_id"?: string,"scores"?: Json | null,"text"?: string,"time_sec"?: number | null,"total_score"?: number | null,"user_id"?: string,"written_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "essays_prompt_id_fkey"
      columns: ["prompt_id"]
isOneToOne: false
      referencedRelation: "essay_prompts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "essays_rubric_id_fkey"
      columns: ["rubric_id"]
isOneToOne: false
      referencedRelation: "rubrics"
      referencedColumns: ["id"]
    }
                  ]
                },"exam_boards": {
                  Row: {
                    "default_format": Database["public"]['Enums']["question_format"],"id": string,"name": string,"wrong_answer_penalty": number
                  }
                  ComputedFields: never
                  Insert: {
                    "default_format": Database["public"]['Enums']["question_format"],"id": string,"name": string,"wrong_answer_penalty"?: number
                  }
                  Update: {
                    "default_format"?: Database["public"]['Enums']["question_format"],"id"?: string,"name"?: string,"wrong_answer_penalty"?: number
                  }
                  Relationships: [
                    
                  ]
                },"exams": {
                  Row: {
                    "active": boolean,"court": string,"created_at": string,"duration_min": number,"essay": Json | null,"exam_board_id": string,"id": string,"objective": NonNullable<Json>,"position": string,"rubric_id": string | null,"target_weight": number,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"court": string,"created_at"?: string,"duration_min": number,"essay"?: Json | null,"exam_board_id": string,"id": string,"objective": NonNullable<Json>,"position": string,"rubric_id"?: string | null,"target_weight"?: number,"year": number
                  }
                  Update: {
                    "active"?: boolean,"court"?: string,"created_at"?: string,"duration_min"?: number,"essay"?: Json | null,"exam_board_id"?: string,"id"?: string,"objective"?: NonNullable<Json>,"position"?: string,"rubric_id"?: string | null,"target_weight"?: number,"year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "exams_exam_board_id_fkey"
      columns: ["exam_board_id"]
isOneToOne: false
      referencedRelation: "exam_boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exams_rubric_id_fkey"
      columns: ["rubric_id"]
isOneToOne: false
      referencedRelation: "rubrics"
      referencedColumns: ["id"]
    }
                  ]
                },"incidences": {
                  Row: {
                    "exam_id": string,"topic_id": string,"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "exam_id": string,"topic_id": string,"value": number
                  }
                  Update: {
                    "exam_id"?: string,"topic_id"?: string,"value"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "incidences_exam_id_fkey"
      columns: ["exam_id"]
isOneToOne: false
      referencedRelation: "exams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidences_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidences_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "v_topic_priority"
      referencedColumns: ["topic_id"]
    }
                  ]
                },"materials": {
                  Row: {
                    "content_md": string | null,"created_at": string,"id": string,"source": Database["public"]['Enums']["content_source"],"subtopic_id": string,"title": string,"type": Database["public"]['Enums']["material_type"],"updated_at": string,"url": string | null,"user_id": string,"verified": boolean,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "content_md"?: string | null,"created_at"?: string,"id"?: string,"source": Database["public"]['Enums']["content_source"],"subtopic_id": string,"title": string,"type": Database["public"]['Enums']["material_type"],"updated_at"?: string,"url"?: string | null,"user_id"?: string,"verified"?: boolean,"version"?: number
                  }
                  Update: {
                    "content_md"?: string | null,"created_at"?: string,"id"?: string,"source"?: Database["public"]['Enums']["content_source"],"subtopic_id"?: string,"title"?: string,"type"?: Database["public"]['Enums']["material_type"],"updated_at"?: string,"url"?: string | null,"user_id"?: string,"verified"?: boolean,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "materials_subtopic_id_fkey"
      columns: ["subtopic_id"]
isOneToOne: false
      referencedRelation: "subtopics"
      referencedColumns: ["id"]
    }
                  ]
                },"mock_exam_questions": {
                  Row: {
                    "mock_exam_id": string,"question_id": string,"sort_order": number,"subject": string
                  }
                  ComputedFields: never
                  Insert: {
                    "mock_exam_id": string,"question_id": string,"sort_order": number,"subject": string
                  }
                  Update: {
                    "mock_exam_id"?: string,"question_id"?: string,"sort_order"?: number,"subject"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mock_exam_questions_mock_exam_id_fkey"
      columns: ["mock_exam_id"]
isOneToOne: false
      referencedRelation: "mock_exams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mock_exam_questions_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"mock_exams": {
                  Row: {
                    "exam_id": string,"finished_at": string | null,"id": string,"passed": boolean | null,"result": Json | null,"started_at": string,"time_limit_min": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "exam_id": string,"finished_at"?: string | null,"id"?: string,"passed"?: boolean | null,"result"?: Json | null,"started_at"?: string,"time_limit_min": number,"user_id"?: string
                  }
                  Update: {
                    "exam_id"?: string,"finished_at"?: string | null,"id"?: string,"passed"?: boolean | null,"result"?: Json | null,"started_at"?: string,"time_limit_min"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mock_exams_exam_id_fkey"
      columns: ["exam_id"]
isOneToOne: false
      referencedRelation: "exams"
      referencedColumns: ["id"]
    }
                  ]
                },"papers": {
                  Row: {
                    "agency": string,"created_at": string,"exam_board_id": string,"exam_id": string | null,"id": string,"position": string,"source_url": string | null,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "agency": string,"created_at"?: string,"exam_board_id": string,"exam_id"?: string | null,"id"?: string,"position": string,"source_url"?: string | null,"year": number
                  }
                  Update: {
                    "agency"?: string,"created_at"?: string,"exam_board_id"?: string,"exam_id"?: string | null,"id"?: string,"position"?: string,"source_url"?: string | null,"year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "papers_exam_board_id_fkey"
      columns: ["exam_board_id"]
isOneToOne: false
      referencedRelation: "exam_boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "papers_exam_id_fkey"
      columns: ["exam_id"]
isOneToOne: false
      referencedRelation: "exams"
      referencedColumns: ["id"]
    }
                  ]
                },"question_topics": {
                  Row: {
                    "question_id": string,"subtopic_id": string | null,"topic_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "question_id": string,"subtopic_id"?: string | null,"topic_id": string
                  }
                  Update: {
                    "question_id"?: string,"subtopic_id"?: string | null,"topic_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "question_topics_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "question_topics_subtopic_id_fkey"
      columns: ["subtopic_id"]
isOneToOne: false
      referencedRelation: "subtopics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "question_topics_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "question_topics_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "v_topic_priority"
      referencedColumns: ["topic_id"]
    }
                  ]
                },"questions": {
                  Row: {
                    "annulled": boolean,"answer_key": string,"base_text": string | null,"commentary_md": string | null,"content_hash": string | null,"created_at": string,"exam_board_id": string,"format": Database["public"]['Enums']["question_format"],"id": string,"number": number | null,"options": Json | null,"paper_id": string | null,"source": Database["public"]['Enums']["content_source"],"statement": string
                  }
                  ComputedFields: never
                  Insert: {
                    "annulled"?: boolean,"answer_key": string,"base_text"?: string | null,"commentary_md"?: string | null,"content_hash"?: string | null,"created_at"?: string,"exam_board_id": string,"format": Database["public"]['Enums']["question_format"],"id"?: string,"number"?: number | null,"options"?: Json | null,"paper_id"?: string | null,"source": Database["public"]['Enums']["content_source"],"statement": string
                  }
                  Update: {
                    "annulled"?: boolean,"answer_key"?: string,"base_text"?: string | null,"commentary_md"?: string | null,"content_hash"?: string | null,"created_at"?: string,"exam_board_id"?: string,"format"?: Database["public"]['Enums']["question_format"],"id"?: string,"number"?: number | null,"options"?: Json | null,"paper_id"?: string | null,"source"?: Database["public"]['Enums']["content_source"],"statement"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "questions_exam_board_id_fkey"
      columns: ["exam_board_id"]
isOneToOne: false
      referencedRelation: "exam_boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_paper_id_fkey"
      columns: ["paper_id"]
isOneToOne: false
      referencedRelation: "papers"
      referencedColumns: ["id"]
    }
                  ]
                },"review_logs": {
                  Row: {
                    "card_id": string,"difficulty": number,"due": string,"elapsed_days": number,"id": string,"last_elapsed_days": number,"learning_steps": number,"rating": number,"reviewed_at": string,"scheduled_days": number,"stability": number,"state": number
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id": string,"difficulty": number,"due": string,"elapsed_days": number,"id"?: string,"last_elapsed_days": number,"learning_steps"?: number,"rating": number,"reviewed_at"?: string,"scheduled_days": number,"stability": number,"state": number
                  }
                  Update: {
                    "card_id"?: string,"difficulty"?: number,"due"?: string,"elapsed_days"?: number,"id"?: string,"last_elapsed_days"?: number,"learning_steps"?: number,"rating"?: number,"reviewed_at"?: string,"scheduled_days"?: number,"stability"?: number,"state"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_logs_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    }
                  ]
                },"rubrics": {
                  Row: {
                    "definition": NonNullable<Json>,"exam_board_id": string,"id": string,"type": Database["public"]['Enums']["essay_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "definition": NonNullable<Json>,"exam_board_id": string,"id": string,"type": Database["public"]['Enums']["essay_type"]
                  }
                  Update: {
                    "definition"?: NonNullable<Json>,"exam_board_id"?: string,"id"?: string,"type"?: Database["public"]['Enums']["essay_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "rubrics_exam_board_id_fkey"
      columns: ["exam_board_id"]
isOneToOne: false
      referencedRelation: "exam_boards"
      referencedColumns: ["id"]
    }
                  ]
                },"schedule_items": {
                  Row: {
                    "date": string,"generated_at": string,"id": string,"minutes": number,"session_id": string | null,"sort_order": number,"stage": Database["public"]['Enums']["cycle_stage"] | null,"status": Database["public"]['Enums']["item_status"],"topic_id": string | null,"type": Database["public"]['Enums']["session_type"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "date": string,"generated_at"?: string,"id"?: string,"minutes": number,"session_id"?: string | null,"sort_order"?: number,"stage"?: Database["public"]['Enums']["cycle_stage"] | null,"status"?: Database["public"]['Enums']["item_status"],"topic_id"?: string | null,"type": Database["public"]['Enums']["session_type"],"user_id"?: string
                  }
                  Update: {
                    "date"?: string,"generated_at"?: string,"id"?: string,"minutes"?: number,"session_id"?: string | null,"sort_order"?: number,"stage"?: Database["public"]['Enums']["cycle_stage"] | null,"status"?: Database["public"]['Enums']["item_status"],"topic_id"?: string | null,"type"?: Database["public"]['Enums']["session_type"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "schedule_items_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "study_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "schedule_items_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "schedule_items_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "v_topic_priority"
      referencedColumns: ["topic_id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "ai_mode": Database["public"]['Enums']["ai_mode"],"desired_retention": number,"hours_per_day": NonNullable<Json>,"infra_quota_min_per_week": number,"new_cards_per_day": number,"target_exam_id": string | null,"theme": Database["public"]['Enums']["theme_preference"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_mode"?: Database["public"]['Enums']["ai_mode"],"desired_retention"?: number,"hours_per_day"?: NonNullable<Json>,"infra_quota_min_per_week"?: number,"new_cards_per_day"?: number,"target_exam_id"?: string | null,"theme"?: Database["public"]['Enums']["theme_preference"],"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "ai_mode"?: Database["public"]['Enums']["ai_mode"],"desired_retention"?: number,"hours_per_day"?: NonNullable<Json>,"infra_quota_min_per_week"?: number,"new_cards_per_day"?: number,"target_exam_id"?: string | null,"theme"?: Database["public"]['Enums']["theme_preference"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "settings_target_exam_id_fkey"
      columns: ["target_exam_id"]
isOneToOne: false
      referencedRelation: "exams"
      referencedColumns: ["id"]
    }
                  ]
                },"study_sessions": {
                  Row: {
                    "ended_at": string | null,"id": string,"planned_minutes": number | null,"stage": Database["public"]['Enums']["cycle_stage"] | null,"started_at": string,"topic_id": string | null,"type": Database["public"]['Enums']["session_type"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ended_at"?: string | null,"id"?: string,"planned_minutes"?: number | null,"stage"?: Database["public"]['Enums']["cycle_stage"] | null,"started_at"?: string,"topic_id"?: string | null,"type": Database["public"]['Enums']["session_type"],"user_id"?: string
                  }
                  Update: {
                    "ended_at"?: string | null,"id"?: string,"planned_minutes"?: number | null,"stage"?: Database["public"]['Enums']["cycle_stage"] | null,"started_at"?: string,"topic_id"?: string | null,"type"?: Database["public"]['Enums']["session_type"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "study_sessions_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "study_sessions_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "v_topic_priority"
      referencedColumns: ["topic_id"]
    }
                  ]
                },"subtopics": {
                  Row: {
                    "id": string,"name": string,"sort_order": number,"topic_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string,"sort_order"?: number,"topic_id": string
                  }
                  Update: {
                    "id"?: string,"name"?: string,"sort_order"?: number,"topic_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subtopics_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subtopics_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "v_topic_priority"
      referencedColumns: ["topic_id"]
    }
                  ]
                },"topics": {
                  Row: {
                    "category": Database["public"]['Enums']["topic_category"],"id": string,"name": string,"phase": Database["public"]['Enums']["study_phase"],"profile": Database["public"]['Enums']["topic_profile"] | null,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "category": Database["public"]['Enums']["topic_category"],"id": string,"name": string,"phase"?: Database["public"]['Enums']["study_phase"],"profile"?: Database["public"]['Enums']["topic_profile"] | null,"sort_order"?: number
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["topic_category"],"id"?: string,"name"?: string,"phase"?: Database["public"]['Enums']["study_phase"],"profile"?: Database["public"]['Enums']["topic_profile"] | null,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "v_topic_performance": {
                  Row: {
                    "answered": number | null,"firm_correct": number | null,"mastery_rate": number | null,"topic_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "question_topics_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "question_topics_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "v_topic_priority"
      referencedColumns: ["topic_id"]
    }
                  ]
                },"v_topic_priority": {
                  Row: {
                    "category": Database["public"]['Enums']["topic_category"],"name": string,"phase": Database["public"]['Enums']["study_phase"],"priority": number | null,"profile": Database["public"]['Enums']["topic_profile"] | null,"topic_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "ai_mode": "off"|"manual"|"api","ai_request_status": "awaiting_response"|"imported"|"discarded","ai_request_type": "summary"|"questions"|"essay_grading"|"classification"|"cards","card_type": "question"|"concept","confidence_level": "guess"|"doubt"|"certain","content_source": "past_paper"|"ai_manual"|"ai_api"|"user"|"official","cycle_stage": "reading"|"questions"|"review","essay_type": "general_essay"|"technical_case_study"|"technical_question"|"technical_questions_and_case_study","item_status": "pending"|"done"|"skipped","material_type": "summary"|"link"|"note","question_format": "multiple_choice"|"true_false","session_type": "cycle"|"review"|"mock_exam"|"essay","study_phase": "pre_notice"|"post_notice","theme_preference": "system"|"light"|"dark","topic_category": "specific"|"general","topic_profile": "systems"|"infra"|"common"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "ai_mode": ["off", "manual", "api"],"ai_request_status": ["awaiting_response", "imported", "discarded"],"ai_request_type": ["summary", "questions", "essay_grading", "classification", "cards"],"card_type": ["question", "concept"],"confidence_level": ["guess", "doubt", "certain"],"content_source": ["past_paper", "ai_manual", "ai_api", "user", "official"],"cycle_stage": ["reading", "questions", "review"],"essay_type": ["general_essay", "technical_case_study", "technical_question", "technical_questions_and_case_study"],"item_status": ["pending", "done", "skipped"],"material_type": ["summary", "link", "note"],"question_format": ["multiple_choice", "true_false"],"session_type": ["cycle", "review", "mock_exam", "essay"],"study_phase": ["pre_notice", "post_notice"],"theme_preference": ["system", "light", "dark"],"topic_category": ["specific", "general"],"topic_profile": ["systems", "infra", "common"]
          }
        }
} as const
