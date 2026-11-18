SET session_replication_role = replica;

COPY "public"."exams" ("id", "name") FROM stdin;
1	TRT
2	TRF
\.

COPY "public"."answers" ("id", "note") FROM stdin;
\.

COPY "auth"."users" ("id", "email") FROM stdin;
u1	a@gabarita.local
\.
