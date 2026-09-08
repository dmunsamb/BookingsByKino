-- Une réservation confirmée dont le moment est passé n'a plus qu'une
-- annulation comme option jusqu'ici, ce qui n'a pas de sens après coup :
-- le client est soit venu (service rendu), soit non (no-show). Ajoute ces
-- deux statuts terminaux pour clôturer une réservation passée sans la
-- traiter comme une simple annulation. Ni l'un ni l'autre ne consomme de
-- capacité (déjà exclus du comptage de enforce_agenda_capacity, qui ne
-- compte que pending_approval/approved_waiting_payment/confirmed).

alter type public.agenda_entry_status add value if not exists 'termine';
alter type public.agenda_entry_status add value if not exists 'no_show';
