-- البذر يُدخل الجهات بمعرّفات صريحة، فيتأخر تسلسل id عنها ويفشل إدخال جهة جديدة من لوحة الإدارة.
SELECT setval(pg_get_serial_sequence('"offices"', 'id'), COALESCE((SELECT MAX("id") FROM "offices"), 0) + 1, false);
