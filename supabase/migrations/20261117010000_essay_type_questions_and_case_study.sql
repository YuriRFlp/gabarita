-- Vunesp (TJSP 2025) grades a single essay stage made of short technical questions plus a case study,
-- which neither 'technical_question' nor 'technical_case_study' describes on its own.
alter type essay_type add value if not exists 'technical_questions_and_case_study';
