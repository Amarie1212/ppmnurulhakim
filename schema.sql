--
-- PostgreSQL database dump
--



-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    key character varying(50) NOT NULL,
    value text,
    updated_by character varying(100),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: tb_akun_santri; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_akun_santri (
    id integer NOT NULL,
    nama character varying(150) NOT NULL,
    email character varying(100) NOT NULL,
    passhash character varying(255) NOT NULL,
    wa character varying(20) NOT NULL,
    kelompok character varying(100),
    desa character varying(100),
    daerah character varying(100),
    status character varying(20) DEFAULT 'PENDING'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    alasan_tolak text,
    kampus character varying(255),
    prodi character varying(255)
);


--
-- Name: tb_akun_santri_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tb_akun_santri_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tb_akun_santri_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tb_akun_santri_id_seq OWNED BY public.tb_akun_santri.id;


--
-- Name: tb_info_ppm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_info_ppm (
    id integer NOT NULL,
    hero_title character varying(200) DEFAULT 'Selamat Datang di PPM Nurul Hakim'::character varying,
    hero_subtitle text,
    profil_pondok text,
    visi text,
    misi jsonb DEFAULT '[]'::jsonb,
    nilai text,
    keunggulan jsonb DEFAULT '[]'::jsonb,
    fasilitas jsonb DEFAULT '[]'::jsonb,
    galeri jsonb DEFAULT '[]'::jsonb,
    alur_pendaftaran jsonb DEFAULT '[]'::jsonb,
    peraturan jsonb DEFAULT '[]'::jsonb,
    biaya character varying(100) DEFAULT 'Rp 3.500.000'::character varying,
    jadwal_mulai date,
    jadwal_selesai date,
    kontak_list jsonb DEFAULT '[]'::jsonb,
    kontak_email character varying(100),
    alamat text,
    section_titles jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    pengumuman text,
    tanggal_kedatangan date,
    kontak_hp character varying(50),
    kontak_instagram character varying(100),
    kontak_panitia text,
    biaya_items jsonb DEFAULT '[]'::jsonb,
    target_santri jsonb DEFAULT '[]'::jsonb,
    manajemen_kesantrian jsonb DEFAULT '[]'::jsonb,
    agenda_harian jsonb DEFAULT '[]'::jsonb,
    agenda_mingguan jsonb DEFAULT '[]'::jsonb,
    agenda_bulanan jsonb DEFAULT '[]'::jsonb,
    agenda_tahunan jsonb DEFAULT '[]'::jsonb,
    lokasi_alamat text,
    lokasi_gmaps_embed text,
    lokasi_image text,
    jadwal_keterangan text,
    fasilitas_gallery jsonb DEFAULT '[]'::jsonb
);


--
-- Name: tb_info_ppm_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tb_info_ppm_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tb_info_ppm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tb_info_ppm_id_seq OWNED BY public.tb_info_ppm.id;


--
-- Name: tb_laporan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_laporan (
    id integer NOT NULL,
    periode_mulai date NOT NULL,
    periode_akhir date NOT NULL,
    total_pembayaran integer DEFAULT 0,
    catatan text,
    dibuat_oleh integer,
    dibuat_at timestamp without time zone DEFAULT now(),
    status character varying(20) DEFAULT 'PENDING'::character varying,
    disetujui_oleh integer,
    disetujui_at timestamp without time zone,
    komentar_ketua text
);


--
-- Name: tb_laporan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tb_laporan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tb_laporan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tb_laporan_id_seq OWNED BY public.tb_laporan.id;


--
-- Name: tb_pembayaran; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_pembayaran (
    id integer NOT NULL,
    santri_id integer NOT NULL,
    jumlah numeric(15,2) DEFAULT 0,
    bukti_path text NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    keterangan text,
    created_at timestamp without time zone DEFAULT now(),
    alasan_tolak text,
    nama_pengirim character varying(255),
    nomor_rekening character varying(50),
    nama_bank character varying(100),
    tanggal_transfer date
);


--
-- Name: tb_pembayaran_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tb_pembayaran_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tb_pembayaran_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tb_pembayaran_id_seq OWNED BY public.tb_pembayaran.id;


--
-- Name: tb_pengumuman; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_pengumuman (
    id integer NOT NULL,
    judul character varying(255),
    isi text,
    tanggal date,
    aktif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: tb_pengumuman_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tb_pengumuman_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tb_pengumuman_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tb_pengumuman_id_seq OWNED BY public.tb_pengumuman.id;


--
-- Name: tb_pengurus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_pengurus (
    id integer NOT NULL,
    nama character varying(100),
    email character varying(100) NOT NULL,
    passhash character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: tb_pengurus_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tb_pengurus_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tb_pengurus_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tb_pengurus_id_seq OWNED BY public.tb_pengurus.id;


--
-- Name: tb_santri; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tb_santri (
    id integer NOT NULL,
    nama character varying(150),
    jk character(1),
    email character varying(100),
    passhash character varying(255),
    wa character varying(20),
    pernah_mondok boolean,
    lulus_muballigh boolean,
    kelurahan character varying(100),
    kecamatan character varying(100),
    kota_kab character varying(100),
    provinsi character varying(100),
    kelompok character varying(100),
    desa character varying(100),
    daerah character varying(100),
    no_ki character varying(20),
    kampus character varying(100),
    prodi character varying(100),
    jenjang character varying(10),
    angkatan character varying(4),
    ayah_nama character varying(150),
    ayah_pekerjaan character varying(100),
    ayah_penghasilan character varying(50),
    ayah_hp character varying(20),
    ibu_nama character varying(150),
    ibu_pekerjaan character varying(100),
    ibu_penghasilan character varying(50),
    ibu_hp character varying(20),
    foto_path text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    status_biodata character varying(20) DEFAULT 'PENDING'::character varying,
    kk_path character varying(255),
    ktp_path character varying(255),
    alasan_tolak text,
    sertifikat_path text
);


--
-- Name: tb_santri_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tb_santri_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tb_santri_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tb_santri_id_seq OWNED BY public.tb_santri.id;


--
-- Name: tb_akun_santri id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_akun_santri ALTER COLUMN id SET DEFAULT nextval('public.tb_akun_santri_id_seq'::regclass);


--
-- Name: tb_info_ppm id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_info_ppm ALTER COLUMN id SET DEFAULT nextval('public.tb_info_ppm_id_seq'::regclass);


--
-- Name: tb_laporan id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_laporan ALTER COLUMN id SET DEFAULT nextval('public.tb_laporan_id_seq'::regclass);


--
-- Name: tb_pembayaran id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_pembayaran ALTER COLUMN id SET DEFAULT nextval('public.tb_pembayaran_id_seq'::regclass);


--
-- Name: tb_pengumuman id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_pengumuman ALTER COLUMN id SET DEFAULT nextval('public.tb_pengumuman_id_seq'::regclass);


--
-- Name: tb_pengurus id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_pengurus ALTER COLUMN id SET DEFAULT nextval('public.tb_pengurus_id_seq'::regclass);


--
-- Name: tb_santri id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_santri ALTER COLUMN id SET DEFAULT nextval('public.tb_santri_id_seq'::regclass);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: tb_akun_santri tb_akun_santri_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_akun_santri
    ADD CONSTRAINT tb_akun_santri_email_key UNIQUE (email);


--
-- Name: tb_akun_santri tb_akun_santri_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_akun_santri
    ADD CONSTRAINT tb_akun_santri_pkey PRIMARY KEY (id);


--
-- Name: tb_info_ppm tb_info_ppm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_info_ppm
    ADD CONSTRAINT tb_info_ppm_pkey PRIMARY KEY (id);


--
-- Name: tb_laporan tb_laporan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_laporan
    ADD CONSTRAINT tb_laporan_pkey PRIMARY KEY (id);


--
-- Name: tb_pembayaran tb_pembayaran_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_pembayaran
    ADD CONSTRAINT tb_pembayaran_pkey PRIMARY KEY (id);


--
-- Name: tb_pengumuman tb_pengumuman_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_pengumuman
    ADD CONSTRAINT tb_pengumuman_pkey PRIMARY KEY (id);


--
-- Name: tb_pengurus tb_pengurus_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_pengurus
    ADD CONSTRAINT tb_pengurus_email_key UNIQUE (email);


--
-- Name: tb_pengurus tb_pengurus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_pengurus
    ADD CONSTRAINT tb_pengurus_pkey PRIMARY KEY (id);


--
-- Name: tb_santri tb_santri_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_santri
    ADD CONSTRAINT tb_santri_pkey PRIMARY KEY (id);


--
-- Name: tb_pembayaran fk_santri; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tb_pembayaran
    ADD CONSTRAINT fk_santri FOREIGN KEY (santri_id) REFERENCES public.tb_santri(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--



