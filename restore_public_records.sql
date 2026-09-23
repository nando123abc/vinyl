-- Generated from backup.sql
-- Restores only app-relevant public tables and data.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.admins (
  email text PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public.records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist text NOT NULL,
  album text NOT NULL,
  year integer,
  quantity integer NOT NULL DEFAULT 1,
  cost_cents integer,
  format text DEFAULT 'LP',
  notes text,
  is_special boolean DEFAULT false,
  is_favorite boolean DEFAULT false,
  cover_url text,
  spotify_url text,
  musicbrainz_release_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  genre text
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.records;
DROP TRIGGER IF EXISTS set_updated_at ON public.records;
CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON public.records
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

TRUNCATE TABLE public.records, public.admins;

INSERT INTO public.admins (email) VALUES
('frodr239@gmail.com')
ON CONFLICT DO NOTHING;

INSERT INTO public.records (id, artist, album, year, quantity, cost_cents, format, notes, is_special, is_favorite, cover_url, spotify_url, musicbrainz_release_id, created_at, updated_at, genre) VALUES
('299b4351-4bd8-4025-922b-fb232d273126', 'Bad Bunny', 'DEBÍ TIRAR MÁS FOTOS', 2025, 1, 2998, 'LP', '', FALSE, TRUE, 'https://coverartarchive.org/release/c9e6b642-a6d9-4b22-8ec1-16c47b6143fc/40857018101.jpg', 'https://open.spotify.com/album/5K79FLRUCSysQnVESLcTdb', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-25 05:58:25.568698+00', 'Latin Urban / Reggaeton'),
('62310a41-90b6-468b-8e0d-86bbb44f61ae', 'Rihanna', 'ANTI (Deluxe)', 2016, 1, 2498, 'LP', NULL, FALSE, FALSE, 'http://coverartarchive.org/release/b8fdf8b5-45f6-4f1d-b7af-b7c28aff8ad8/32325572219.jpg', 'https://open.spotify.com/album/4UlGauD7ROb3YbVOFMgW5u', NULL, '2025-09-02 05:40:24.334256+00', '2025-09-02 05:40:24.334256+00', 'Pop music / Alternative R&B'),
('2436f8ef-50aa-4330-bd78-da2afb5b64ac', 'Frank Ocean', 'Channel Orange', 2012, 1, 11770, 'LP', 'Reissued Jul 2025 / Limited pressing', TRUE, FALSE, 'http://coverartarchive.org/release/a942130d-bf15-4a5b-9903-a2bd69792e0a/27572658405.jpg', 'https://open.spotify.com/album/392p3shh2jkxUxY2VHvlH8', NULL, '2025-09-09 22:34:11.822193+00', '2025-09-09 22:36:09.725879+00', 'Alternative R&B'),
('e940abc4-6a2d-4ac0-b675-ebdb2da46ce2', 'IDK & KAYTRANADA', 'Simple.', 2022, 1, NULL, 'LP', '', FALSE, FALSE, '', 'https://open.spotify.com/album/2BeEXKn0ecWhwxOftmUZhy', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Hip-Hop / Electronic'),
('48264638-4f70-4bc4-b409-137c3cd740a8', 'Kali Uchis', 'Por Vida (10th Anniversary Edition)', 2025, 1, 3300, 'LP', '10 Year Anniversary Edition - Blue Rush Vinyl', TRUE, FALSE, 'http://coverartarchive.org/release/03c33bf4-f27f-42f5-bd0e-0fcedeac9440/21893866225.jpg', 'https://open.spotify.com/album/6f5gAJpM85TE6aQ81h46T5', NULL, '2025-08-29 21:57:41.093541+00', '2025-09-02 06:31:55.107993+00', 'Latin Pop / R&B'),
('2448093d-e4fb-4dd5-9cec-eb1e99a638b7', 'Justice', 'HYPERDRAMA', 2024, 1, 3499, 'LP', NULL, FALSE, FALSE, 'https://coverartarchive.org/release/9769861c-0e0a-484b-94f8-f8deca73f2a8/39789114773.png', 'https://open.spotify.com/album/6ooBxhsOVedpX4zPTCyL86', NULL, '2025-09-02 06:05:42.607619+00', '2025-09-09 22:36:48.491699+00', 'Electro House'),
('cd66bc3f-3ee5-49f8-bafe-ca1d0213d4ea', 'Marvin Gaye', 'What''s Going On', 1971, 1, NULL, 'LP', NULL, FALSE, FALSE, NULL, 'https://open.spotify.com/album/2v6ANhWhZBUKkg6pJJBs3B', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Soul / R&B'),
('4723bbe6-f603-4e00-a2e6-820318455dd2', 'Masego', 'Capitol Cuts (Live From Studio A)', 2021, 1, NULL, 'LP', NULL, FALSE, FALSE, NULL, 'https://open.spotify.com/album/2fXkjVO9AFYfjmOJ5WIzFs', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Jazz / R&B'),
('f28ef98b-8626-4938-8b6d-82b746924805', 'Doja Cat', 'Vie (Signed)', 2025, 1, 3800, 'LP', 'Signed', TRUE, FALSE, 'https://coverartarchive.org/release/278f0815-1a3d-461e-80ac-a8afd9e8f1e7/42831463070.jpg', '', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-25 06:02:22.197558+00', 'Pop Rap / R&B'),
('531ac5c8-335d-4d11-9e5d-40b5e7ece3a5', 'J. Cole', '2014 Forest Hills Drive', 2014, 1, NULL, 'LP', '', FALSE, TRUE, 'http://coverartarchive.org/release/bbd931f0-f3ad-4550-b1cd-862e4b70cc03/29608605409.jpg', 'https://open.spotify.com/album/0UMMIkurRUmkruZ3KGBLtG', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 23:59:19.921922+00', 'Hip-Hop / Rap'),
('9c7bc0e2-84a0-404a-b189-4ae34356eb7e', 'Kanye West', 'My Beautiful Dark Twisted Fantasy', 2010, 1, NULL, 'LP', '', FALSE, TRUE, 'http://coverartarchive.org/release/26b017c9-5506-4117-8667-ea981282bab0/27457858814.jpg', 'https://open.spotify.com/album/20r762YmB5HeofjMCiPMLv', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 23:59:57.587728+00', 'Hip-Hop / Rap'),
('892ed0ce-1e85-4e62-9ce3-1c037172241e', 'Kendrick Lamar', 'DAMN.', 2017, 1, NULL, 'LP', '', FALSE, TRUE, 'https://coverartarchive.org/release/f5eddaa6-3a79-47d5-ab80-f2e1d8f6bfd8/16595865340.jpg', 'https://open.spotify.com/album/4eLPsYPBmXABThSJ821sqY', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-25 00:00:05.886007+00', 'Hip-Hop / Rap'),
('dfa40e86-cc3c-4ec3-8099-ad25d7bcb138', 'Erykah Badu', 'Mama''s Gun', 2000, 1, 3799, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/b6b5b654-5c60-4520-b099-4a50d33e2bd0/882556108.jpg', 'https://open.spotify.com/album/3cADvHRdKniF9ELCn1zbGH', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-29 00:49:14.722907+00', 'R&B / Neo-Soul'),
('a90c7c32-8002-473f-94a7-dd0cad1a0afe', 'Ezra Collective', 'Where I''m Meant To Be (Signed - Limited Colour)', 2022, 1, NULL, 'LP', 'Signed', TRUE, FALSE, 'http://coverartarchive.org/release/5aca2dfe-515b-4605-93bc-b4d25f1f36e3/34213146812.jpg', 'https://open.spotify.com/album/4bFZYpPPKHvsVsmYEYnIRk', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-25 00:02:42.183962+00', 'Jazz / Afrobeat'),
('32f3c7af-c382-4396-971d-1cb3bf3903b4', 'KAYTRANADA', 'BUBBA', 2019, 1, 2599, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/dce6ae2d-949f-40b2-8fb3-c7efc7a42ab9/28564424682.png', 'https://open.spotify.com/album/5FQ4sOGqRWUA5wO20AwPcO', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-29 00:53:08.09565+00', 'Electronic / House'),
('65f7b7b1-8ff7-4ca7-8e99-1597f8de5a39', 'Beyoncé', 'Renaissance', 2022, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/43466454-334d-47e7-b51d-c8cb3dcb83fc/35804033059.png', 'https://open.spotify.com/album/6FJxoadUE4JNVwWHghBwnb', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Dance / House / Pop'),
('76cd9d0c-43e3-4d60-878b-8d2c10bc41d3', 'Chance The Rapper', 'Acid Rap', 2013, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/8caabc0f-8c2a-4060-893f-f71bc93cc073/4125216283.jpg', 'https://open.spotify.com/album/1R7pX4ZKXfMprvWqYJ57iA', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Hip-Hop / Rap'),
('d6bc025b-9688-4e42-9e7d-08c8549f4020', 'Chris Stapleton', 'Traveller', 2015, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/159d47ec-8966-439b-b1db-6348de3ea9f0/12634843024.jpg', 'https://open.spotify.com/album/7lxHnls3yQNl8B9bILmHj7', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Country / Americana'),
('2168eb11-a1fb-4ce0-aa1e-9bfd67f830df', 'Drake', 'Take Care (Deluxe)', 2011, 1, NULL, 'LP', '', FALSE, FALSE, 'https://coverartarchive.org/release/1e268632-6b5a-4592-bd60-64be3276d104/39501156583.jpg', 'https://open.spotify.com/album/1MzE8KeSTNbs3iNosDI7d3', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Hip-Hop / R&B'),
('8e49d807-0f0f-49dc-bddc-b6ce5c8d79fc', 'Ari Lennox', 'Shea Butter Baby', 2019, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/6fe8d6f1-cd82-4725-91c8-abd3b592e543/22879784369.jpg', 'https://open.spotify.com/album/3hejjJbFsinMBc1KBqF71w', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'R&B / Neo-Soul'),
('adbee393-64e5-42e9-9f4f-4d5a29261ee1', 'Kali Uchis', 'Isolation', 2018, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/25d5e4f9-5153-4bbe-baa3-5b026c1ec2c2/19560012473.jpg', 'https://open.spotify.com/album/4EPQtdq6vvwxuYeQTrwDVY', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'R&B / Pop'),
('bc1c44b4-fe8f-40fa-88b9-0e6b3d170f0f', 'Various Artists', 'We Out Here', 2018, 1, NULL, 'LP', 'Brownswood compilation feat. Ezra Collective', FALSE, FALSE, 'http://coverartarchive.org/release/987e409b-8953-4e71-9135-a886969f63ce/18995942457.jpg', 'https://open.spotify.com/album/3Pv6mwJhDCHsM04UqY0ueZ', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Jazz / Compilation'),
('52bad578-f5b7-4796-80bd-95c5b2c6c96a', 'Kali Uchis', 'Red Moon In Venus', 2023, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/5f55c6fd-4035-4287-a5ed-1c3a3dfb0fef/34699689387.jpg', 'https://open.spotify.com/album/5OZ44LaqZbpP3m9B3oT8br', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'R&B / Pop'),
('7c28ccca-389a-4d34-abcf-72396b4df489', 'Kendrick Lamar', 'To Pimp A Butterfly', 2015, 1, NULL, 'LP', '', FALSE, FALSE, 'https://coverartarchive.org/release/7d2294a9-fde9-4496-8ded-18e7ea8b7e29/40040680528.jpg', 'https://open.spotify.com/album/7ycBtnsMtyVbbwTfJwRjSP', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Hip-Hop / Rap'),
('576267c7-7502-425f-a24a-0f5eba4b27da', 'Childish Gambino', 'Because the Internet', 2013, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/af54650b-5020-4b8b-a121-3f32f31d86eb/5905091136.jpg', 'https://open.spotify.com/album/1g4RsQxvVZ3x8t0Q8Rz3eH', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Hip-Hop / Alternative'),
('88377a07-1003-4f7c-a6e0-1a30fe1cc816', 'J. Cole', 'Born Sinner (Deluxe Version)', 2013, 1, NULL, 'LP', '', FALSE, FALSE, 'https://coverartarchive.org/release/542d7165-12d6-4b50-8a12-19ef0a78d374/4393398535.jpg', 'https://open.spotify.com/album/5FP9keIJnlSCKnkdVOf623', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Hip-Hop / Rap'),
('37e96ec1-5ef2-41ef-9c7d-b757fa404ff7', 'Bryson Tiller', 'T R A P S O U L', 2015, 1, 2299, 'LP', '', FALSE, FALSE, 'https://coverartarchive.org/release/22b28f3e-48b9-402b-b9fd-7de08f345970/27351491025.jpg', 'https://open.spotify.com/album/6eZdwrhB97A3EYx9QppGfl', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-29 00:56:49.531284+00', 'R&B / Trap Soul'),
('5219579e-06ff-44c4-bcf2-77389d29d91b', 'J. Cole', '2014 Forest Hills Drive (10 Year Anniversary)', 2024, 1, 4600, 'LP', '10 Year Anniversary Reissue', TRUE, TRUE, 'http://coverartarchive.org/release/bbd931f0-f3ad-4550-b1cd-862e4b70cc03/29608605409.jpg', 'https://open.spotify.com/album/2fSAC0ZiYnwKfzLEvyaMm8', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-25 06:00:28.084176+00', 'Hip-Hop / Rap'),
('0d209608-cf8c-4873-9007-0006ecf64931', 'KAYTRANADA', 'TIMELESS', 2024, 1, 3500, 'LP', '', FALSE, TRUE, 'https://coverartarchive.org/release/be719047-5efa-4fed-b348-db924bd40337/38884535638.jpg', 'https://open.spotify.com/album/3C3t2bKhwEL3wdKioqWUDh', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-29 20:25:20.11583+00', 'Electronic / House'),
('0aa59ac7-b9cd-4bde-a8c2-406166d698a2', 'Mac DeMarco', 'This Old Dog', 2017, 1, 2673, 'LP', NULL, FALSE, FALSE, 'http://coverartarchive.org/release/e8296515-2615-423e-aa38-233be1765bf7/17266918530.jpg', 'https://open.spotify.com/album/4NNq2vwTapv4fSJcrZbPH7', NULL, '2025-09-02 05:26:17.582764+00', '2025-09-02 05:26:17.582764+00', 'Alternative / Indie'),
('bb69444f-b0d5-463d-87d2-300c4dee8d3c', 'Pink Floyd', 'The Dark Side of the Moon (50th Anniversary) ', 1973, 1, 3298, 'LP', '50th Anniversary Remaster', TRUE, FALSE, 'https://coverartarchive.org/release/b3ace569-c2ce-4327-84ff-5920bd115bcf/front.jpg', 'https://open.spotify.com/album/4LH4d3cOWNNsVw41Gqt2kv', NULL, '2025-09-02 06:13:42.886372+00', '2025-09-02 06:31:14.873791+00', 'Progressive rock / Psychedelic rock / Hard rock / Art rock / Space rock / Experimental rock'),
('60679927-d104-4094-befd-e6dfd48c3bde', 'Future', 'MIXTAPE PLUTO', 2024, 1, NULL, 'LP', '', FALSE, FALSE, 'https://coverartarchive.org/release/f7e91329-519d-46f0-8a34-ce094f80ffaa/39927637815.jpg', 'https://open.spotify.com/album/5IcsHifVLGG0emBPlMZacj', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Hip-Hop / Trap'),
('74f4cb23-1b12-4af7-a6d8-614d23093c07', 'Black Pumas', 'Black Pumas', 2019, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/226e1cc6-f139-4a35-90a3-cb6be7fdf6ef/24739627982.jpg', 'https://open.spotify.com/album/2bNom0eA3G7rnKcatKQb5H', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Psychedelic Soul / Soul'),
('ef519c7b-04ff-4ae1-81b9-e9b30e58812b', 'Seatbelts', 'Cowboy Bebop: Original Motion Picture Soundtrack', 2002, 1, NULL, 'LP', 'Movie soundtrack', FALSE, FALSE, 'http://coverartarchive.org/release/4b8e94c7-73e1-4930-9e11-ce771477ab6a/30989980941.jpg', 'https://open.spotify.com/album/6qce1uZK8OEIOC2dXrDCCW', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Jazz / Soundtrack'),
('b713fbbb-c9a6-4c28-acc0-15944c0e3d6a', 'Baby Keem', 'The Melodic Blue', 2021, 1, NULL, 'LP', '', FALSE, FALSE, 'https://coverartarchive.org/release/a5503103-e92d-4c6f-86c8-493239ce191d/38454284039.jpg', 'https://open.spotify.com/album/7n23fjZTviIUnHyvZGQjni', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Hip-Hop / Rap'),
('25153152-0daa-4089-88b2-a8e1e9e4f0ac', 'Isaiah Rashad', 'The House Is Burning', 2021, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/a9c94819-f475-4682-a02f-60ec66cab546/31449798925.jpg', 'https://open.spotify.com/album/6TQ8nqw43uUOWu7Yqp58ko', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Hip-Hop / Rap'),
('da7654a5-0894-4712-b2ab-68fa809fc308', 'Leon Bridges', 'Coming Home', 2015, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/6487c23e-42f8-4fc2-972b-21f6c96d29a9/35479719591.jpg', 'https://open.spotify.com/album/4svLfrPPk2npPVuI4kXPYg', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Soul / R&B'),
('f5d1253e-870f-4796-a89a-e8d3ea53dd98', 'Daniel Caesar', 'CASE STUDY 01', 2019, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/fbca2693-b11f-401d-8e69-ae2787a41782/24480122166.jpg', 'https://open.spotify.com/album/4mvxoogQn8p84Wz17zTHnJ', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'R&B / Neo-Soul'),
('bbc81f18-f166-4b12-a9d2-7f4b783eb756', 'Durand Jones & The Indications', 'Private Space', 2021, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/e60a3882-4ae3-4420-a312-fdf5496d4a85/37911832209.jpg', 'https://open.spotify.com/album/2zLZlyYeP0EWj4Jf2oId9w', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Soul / R&B'),
('21421586-c207-4f43-9985-94e9b908720b', 'Ms. Lauryn Hill', 'MTV Unplugged No. 2.0', 2002, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/2938e574-6968-4058-802d-3683a549790d/34355934664.jpg', 'https://open.spotify.com/album/5sHByOqrDlhVXmMamZN49L', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Neo-Soul / Acoustic'),
('0fec6d66-2c28-44d2-84e5-7f52552b7d5b', 'Travis Scott', 'UTOPIA', 2023, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/a12f63f9-8bae-4726-82d5-66268b48a89f/37215325729.jpg', 'https://open.spotify.com/album/18NOKLkZETa4sWwLMIm0UZ', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Hip-Hop / Trap'),
('11de5777-0477-4402-81b1-951a1975eca3', 'Kali Uchis', 'ORQUÍDEAS', 2024, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/2c0246ac-0249-4f84-bb19-2470191ab5cf/36977450511.jpg', 'https://open.spotify.com/album/5U20AVSsUvycGtWip4XQfo', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Latin Pop / R&B'),
('50fa8666-37e3-4fa0-a935-1881fe4e93d0', 'SAULT', '5', 2019, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/42306580-ccf0-4e50-917d-762fe5507701/24191117060.jpg', 'https://open.spotify.com/album/57EkTny9UjqpLhFzMO4Hdb', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Soul / R&B / Funk'),
('558d2025-538d-495a-9e7f-e34e8d12a999', 'Ms. Lauryn Hill', 'The Miseducation of Lauryn Hill', 1998, 1, NULL, 'LP', '', FALSE, TRUE, 'http://coverartarchive.org/release/c6e5d8ca-89e3-303c-b649-85f577e0cbc6/3376969940.jpg', 'https://open.spotify.com/album/2Uc0HAF0Cj0LAgyzYZX5e3', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-25 00:00:18.064367+00', 'Hip-Hop / R&B / Neo-Soul'),
('fb133e06-9796-437c-af6b-441649f7eeee', 'SZA', 'Ctrl', 2017, 1, NULL, 'LP', '', FALSE, TRUE, 'http://coverartarchive.org/release/7ffe5c0f-99a5-4a53-affc-75ae8241bbf0/16823622437.jpg', 'https://open.spotify.com/album/76290XdXVF9rPzGdNRWdCh', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-25 00:00:27.602836+00', 'Alternative R&B'),
('4bd96a9c-7c8e-4549-b1c6-b21910114e3b', 'Tems', 'For Broken Ears', 2020, 1, NULL, 'EP', 'Limited Edition - Diggers Factory exclusive. Limited to 600 numbered copies.', TRUE, TRUE, 'http://coverartarchive.org/release/0e803306-22b6-4c5c-8f70-0d95109379aa/32701282847.jpg', 'https://open.spotify.com/album/2sU8ByeYc5BOBFNDr58CGV', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-25 05:55:02.487055+00', 'Afrobeats / R&B'),
('6169f920-89cc-4b6e-b218-c75811e995a5', 'Tyler, The Creator', 'IGOR', 2019, 1, NULL, 'LP', '', FALSE, TRUE, 'https://coverartarchive.org/release/4603cee3-ece6-435c-b0b7-7d9eb1842d36/23182237048.jpg', 'https://open.spotify.com/album/5zi7WsKlIiUXv09tbGLKsE', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-25 00:00:44.285531+00', 'Hip-Hop / Alternative'),
('80a57387-80a7-4edb-8cf8-862377549eda', 'Ravyn Lenae', 'Crush EP', 2018, 1, 2198, 'EP', '', FALSE, FALSE, 'https://coverartarchive.org/release/1e886172-797d-4ef1-b710-ac4e066bc59a/19116120202.jpg', 'https://open.spotify.com/album/7jxrYnrAa06rekcs1cxp7i', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-25 05:57:24.371902+00', 'R&B / Neo-Soul'),
('119dacae-b46a-488b-b7a1-018cb8edd3af', 'Miles Davis', 'We Want Miles', 1982, 1, 4495, 'LP', 'Pick your preferred edition; this is Expanded', FALSE, FALSE, 'http://coverartarchive.org/release/c9f0af55-1028-42ea-bf92-a8dcf003d040/12269204598.jpg', 'https://open.spotify.com/album/2oCRsCsro2dGfueFx9gD53', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-29 00:34:05.340441+00', 'Jazz Fusion / Live'),
('131c7363-8e5e-42d8-a7f3-fe5ecccaabb1', 'Frank Ocean', 'Endless (Bootleg, unsure)', 2016, 1, 6501, 'LP', 'Unofficial vinyl; link may reflect a reissue/placeholder', FALSE, FALSE, 'https://coverartarchive.org/release/6d38a7f8-7aa7-4a9b-8330-7623ce4e9272/40744279301.jpg', 'https://open.spotify.com/album/4DH7vXyYdLG0OWvnoI48GJ', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-29 00:40:08.32386+00', 'Alternative R&B / Experimental'),
('002bea35-ea76-4403-830a-a584d0a92b6d', 'SZA', 'SOS', 2022, 1, 3599, 'LP', '', FALSE, FALSE, 'https://coverartarchive.org/release/b82458a3-7d3a-495f-861f-8698731c4dd0/34281078448.jpg', 'https://open.spotify.com/album/07w0rG5TETcyihsEIZR3qG', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-29 00:51:02.887325+00', 'Alternative R&B / Pop'),
('6cb5ce10-f665-4cf5-9d0e-bab43e144b5d', 'Steve Lacy', 'Gemini Rights', 2022, 1, 2299, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/b6782fa5-d657-4116-96fd-d0175277b7bf/36432006507.jpg', 'https://open.spotify.com/album/3Ks0eeH0GWpY4AU20D5HPD', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-29 00:57:16.259219+00', 'Alternative R&B / Indie'),
('865d1647-498c-4f0e-bbcd-93233198bcc7', 'Durand Jones & The Indications', 'American Love Call', 2019, 1, 2299, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/91d0364b-937a-4fc0-b190-a8599b9eead0/27932897371.jpg', 'https://open.spotify.com/album/4M3rC8XvZfL8tV5mQh5l3T', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-29 01:06:15.646488+00', 'Soul / R&B'),
('57778fc7-78a8-4d4f-bf45-7f3fb64ed139', 'Blood Orange', 'Angel''s Pulse', 2019, 1, 2399, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/9d35e29e-0ccb-435b-9232-f4e028100ef5/24834249807.jpg', 'https://open.spotify.com/album/6gPcjo5vWmy6M3bEodFNLx', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-29 01:09:23.79433+00', 'Alternative R&B'),
('0db200db-605d-4f7b-ae12-c75bc78d3510', 'J. Cole', 'Cole World: The Sideline Story', 2011, 2, 3799, 'LP', '', FALSE, FALSE, 'https://coverartarchive.org/release/3ebee787-e7eb-4595-8ecd-caafc61b94ca/3316365974.jpg', 'https://open.spotify.com/album/0fhmJYVhW0e4i33pCLPA5i', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-29 01:10:09.22296+00', 'Hip-Hop / Rap'),
('ac519713-9df1-4705-b615-3438391f51a4', 'The Internet', 'Ego Death', 2015, 1, 3899, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/e10f609f-4734-4010-bdb4-75d9ee377de5/32902965334.jpg', 'https://open.spotify.com/album/69g3CtOVg98TPOwqmI2K7Q', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-29 01:11:15.145825+00', 'Alternative R&B / Neo-Soul'),
('3d2a6336-419c-440b-8dad-7c8ffeaa86bc', 'J. Cole', '4 Your Eyez Only', 2016, 1, 3204, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/b70566b5-8fd7-4734-85f3-3abaa129e64e/19026584325.jpg', 'https://open.spotify.com/album/3CCnGldVQ90c26aFATC1PW', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-29 01:11:59.370012+00', 'Hip-Hop / Rap'),
('e5da0b31-fbc1-4abd-9f6f-bb6a1d7e53c1', 'Gorillaz', 'Demon Days', 2005, 1, 3999, 'LP', '', FALSE, FALSE, 'https://coverartarchive.org/release/2968b394-7ca8-3b6a-a3ec-a0239adb01c9/4436715369.jpg', 'https://open.spotify.com/album/0bUTHlWbkSQysoM3VsWldT', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-29 01:12:11.475786+00', 'Alternative Rock / Electronica'),
('8a48d45c-2195-4631-87e4-56fc8cc74164', 'Ryo Fukui', 'Ryo Fukui in New York', 1999, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/d524f277-8585-4958-9bf3-0d1f15167a59/23741678600.jpg', 'https://open.spotify.com/album/4kW1D6GgDZjTXGSnpO31o0', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Jazz'),
('b817e3a8-0332-486b-b3fe-b6c9096d2a39', 'KAYTRANADA', '99.9%', 2016, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/424a6c98-eebe-46ac-9b04-e9844b0d8e7a/13085013575.jpg', 'https://open.spotify.com/album/6JD4Qerb8IcaAzFgpFw0sa', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Electronic / House'),
('fb9b784f-3d23-48c1-a860-868344fcbb4b', 'Various Artists', 'Black Panther: The Album', 2018, 1, NULL, 'LP', 'Curated by Kendrick Lamar', FALSE, FALSE, 'http://coverartarchive.org/release/ee0d0842-ec61-489e-b3fd-0dce810b3a23/29571978410.jpg', 'https://open.spotify.com/album/3pLdWdkj83EYfDN6H2N8MR', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Hip-Hop / Soundtrack'),
('8c5b97d2-4bd6-4941-ab58-9478d6b44bd4', 'Miles Davis', 'Bitches Brew', 1970, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/432048e8-9f82-4d67-a29d-781a8df28475/12676938708.jpg', 'https://open.spotify.com/album/3Q0zkOZEOC855ErOOJ1AdO', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Jazz Fusion'),
('db445f39-a51d-4023-a696-15286079ff33', 'Toro y Moi', 'MAHAL', 2022, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/11ab45df-ee87-4785-8dde-a317b180c9fe/31568155367.jpg', 'https://open.spotify.com/album/16AQyjz1z9rOsTm6iVrBUR', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Indie / Psych Pop'),
('0832633a-46e2-458e-93a2-bac5c6223451', 'Toro y Moi', 'Anything In Return', 2013, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/82203290-65b2-4825-8b8d-725dfe2c6118/13579501882.jpg', 'https://open.spotify.com/album/3xDRuOqakukb1SjHQG4WWc', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Indie Electronic / Chillwave'),
('a0471672-991e-4b11-accb-f718bc29404b', 'Tame Impala', 'Currents', 2015, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/8e7746ca-7832-41b2-a731-de5b0010f37d/13249592911.jpg', 'https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'Psychedelic Pop'),
('3e7645a8-d769-4346-825c-b9273b1a8b95', 'Anderson .Paak', 'Malibu', 2016, 1, NULL, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/b0a1c506-66c8-4f16-b1c9-745ba5d53194/12463424584.jpg', 'https://open.spotify.com/album/4VFG1DOuTeDMBjBLZT7hCK', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 22:53:04.285548+00', 'R&B / Neo-Soul'),
('ce3b99a0-e6cc-45e1-be96-12c57d79167f', 'Curtis Mayfield', 'The Very Best of Curtis Mayfield', 1997, 1, 3799, 'LP', 'Compilation', FALSE, FALSE, 'http://coverartarchive.org/release/9e6c3c7c-96b1-4516-9335-01e5362161d2/6916666983.png', 'https://open.spotify.com/album/7gIpK0Jm6PgWJvH0I6pKaH', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-29 00:40:45.671565+00', 'Soul / Funk'),
('f0b902f2-7ea5-4888-a806-c6a24c87f80d', 'Justice', 'Cross (15th Anniversary Edition)', 2007, 1, 5500, 'LP', '15th Anniversary edition exclusively for Vinyl Me Please Essentials (June 2022).', TRUE, FALSE, 'https://coverartarchive.org/release/b9a10e59-b90b-4da9-ab82-67a92ca1703c/front', 'https://open.spotify.com/album/38wVbgi0KToecxWxNYNutr', NULL, '2025-09-02 06:28:02.278122+00', '2025-09-09 22:36:52.519881+00', 'Electro House'),
('c26ee762-db36-411d-a961-75dd0a8947b0', 'Kanye West', 'The College Dropout', 2004, 1, NULL, 'LP', '', FALSE, TRUE, 'http://coverartarchive.org/release/99a96bf6-8166-3b7c-97ed-ea525f13ec65/34245157344.jpg', 'https://open.spotify.com/album/4Uv86qWpGTxf7fU7lG5X6F', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-24 23:59:50.045062+00', 'Hip-Hop / Rap'),
('0b79dab9-5486-43ba-a193-48fdaee695e4', 'Tyler, The Creator', 'CALL ME IF YOU GET LOST', 2021, 1, NULL, 'LP', '', FALSE, TRUE, 'https://coverartarchive.org/release/0d8d50e3-6899-4bad-8780-3713f2b87e10/29709457239.png', 'https://open.spotify.com/album/45ba6QAtNrdv6Ke4MFOKk9', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-25 00:00:52.269013+00', 'Hip-Hop / Rap'),
('27b2ed80-3e13-4393-a215-e231b7220085', 'Frank Ocean', 'Blonde (Limited Print)', 2016, 1, NULL, 'LP', 'Limited pressing', TRUE, TRUE, 'http://coverartarchive.org/release/8294645a-f996-44b6-9060-7f189b9f59f3/14420632959.jpg', 'https://open.spotify.com/album/3mH6qwIy9crq0I9YQbOuDf', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-25 00:01:47.807838+00', 'Alternative R&B / Art Pop'),
('92511423-9900-4846-bc79-c12b78fa1653', 'James Brown & The Famous Flames', 'James Brown & The Famous Flames', 1958, 1, NULL, '7-inch single', 'There are multiple early albums; confirm which one you own', FALSE, FALSE, 'https://coverartarchive.org/release/938643be-600d-4da3-8748-464b0b9ffbf4/1787310385.jpg', '', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-29 21:41:05.615407+00', 'Soul / R&B'),
('9d10be98-912b-4c78-9dc5-032e1b2eee04', 'Drake', 'Care Package', 2019, 1, 5499, 'LP', 'Bootleg', FALSE, FALSE, 'http://coverartarchive.org/release/d5c3ab50-8ff4-44f4-bf64-dff32e13a259/25127843720.jpg', 'https://open.spotify.com/album/2cWBwpqMsDJC1ZUwz813lo', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-29 00:39:54.121573+00', 'Hip-Hop / Rap'),
('db14c948-f2f9-4d18-9fc0-e75e7b6ef631', 'Kendrick Lamar', 'good kid, m.A.A.d city (Deluxe)', 2012, 1, 2499, 'LP', '', FALSE, FALSE, 'http://coverartarchive.org/release/d5bcadc9-d6b2-4119-bf50-af1b9dca834c/22057643526.png', 'https://open.spotify.com/album/3DGQ1iZ9XKUQxAUWjfC34w', NULL, '2025-08-24 11:45:20.50881+00', '2025-08-29 00:40:32.13244+00', 'Hip-Hop / Rap'),
('4df01a28-2a1b-4265-8b1c-c10167197fe4', 'Leon Thomas', 'HEEL (MUTT Deluxe)', 2025, 1, 3799, 'LP', 'MUTT Deluxe: HEEL Standard Translucent Ruby Vinyl', FALSE, FALSE, 'https://coverartarchive.org/release/0de34b48-a3ae-46e9-ad33-1141bf682851/39992885126.pnghttps://coverartarchive.org/release/0de34b48-a3ae-46e9-ad33-1141bf682851/39992885126.png', 'https://open.spotify.com/album/0SzoksypeognxYJJOJEYip', NULL, '2025-09-02 05:34:32.499971+00', '2025-09-02 05:34:32.499971+00', 'Contemporary R&B / Hip-hop / Soul music'),
('6534988f-6c5a-4849-b558-8a253c2bb3ab', 'Frank Ocean', 'channel ORANGE (Bootleg pressing)', 2012, 1, 9000, 'LP', 'Vinyl noted as bootleg; official album linked', FALSE, TRUE, 'http://coverartarchive.org/release/a942130d-bf15-4a5b-9903-a2bd69792e0a/27572658405.jpg', 'https://open.spotify.com/album/392p3shh2jkxUxY2VHvlH8', NULL, '2025-08-24 11:45:20.50881+00', '2025-09-09 22:35:37.580151+00', 'Alternative R&B')
ON CONFLICT DO NOTHING;

ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins can read/write" ON public.records;
DROP POLICY IF EXISTS "anon can read records" ON public.records;
DROP POLICY IF EXISTS admin_delete_records ON public.records;
DROP POLICY IF EXISTS admin_insert_records ON public.records;
DROP POLICY IF EXISTS admin_update_records ON public.records;
DROP POLICY IF EXISTS anon_read_records ON public.records;
DROP POLICY IF EXISTS auth_read_records ON public.records;

CREATE POLICY "anon can read records"
ON public.records
FOR SELECT
USING (auth.role() = 'anon');

CREATE POLICY "admins can read/write"
ON public.records
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admins a
    WHERE a.email = auth.jwt() ->> 'email'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins a
    WHERE a.email = auth.jwt() ->> 'email'
  )
);

REVOKE ALL ON TABLE public.records FROM anon, authenticated;
GRANT SELECT (id, artist, album, year, quantity, format, notes, is_special, is_favorite, cover_url, spotify_url, musicbrainz_release_id, created_at, updated_at, genre)
ON public.records TO anon;
GRANT SELECT (id, artist, album, year, quantity, format, notes, is_special, is_favorite, cover_url, spotify_url, musicbrainz_release_id, created_at, updated_at, cost_cents, genre)
ON public.records TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.records TO authenticated;
GRANT ALL ON TABLE public.records TO service_role;
GRANT ALL ON TABLE public.admins TO service_role;

COMMIT;
