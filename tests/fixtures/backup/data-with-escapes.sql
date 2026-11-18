COPY public.notes (id, body) FROM stdin;
1	linha com\ttab e acentuação: ação, coração
2	barra invertida \\ no meio
3	quebra\nescapada
4	\\.
5	\\\.
\.

COPY public.tags (name) FROM stdin;
\\.
plain
\.
