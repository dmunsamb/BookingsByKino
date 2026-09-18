/**
 * Constantes et utilitaires photo partagés entre client et serveur (pas
 * de "server-only" ici : voir lib/supabase/media-admin.ts pour l'upload,
 * réservé au serveur). Aucune transformation d'image à la volée
 * (redimensionnement Supabase Storage) pour l'instant — dépend d'une
 * fonctionnalité qui n'est pas forcément activée sur tous les plans, et
 * casser silencieusement l'affichage des photos existantes n'est pas un
 * risque à prendre sur une base déjà en production. On sert donc l'URL
 * publique telle quelle, avec chargement différé (loading="lazy") côté
 * composants.
 */
export const MEDIA_BUCKET = "media";
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo, aligné sur le bucket (migration 0023)
export const MAX_BUSINESS_PHOTOS = 8;
export const ACCEPTED_PHOTO_TYPES = "image/jpeg,image/png,image/webp";
