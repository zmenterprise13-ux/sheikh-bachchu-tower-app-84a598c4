UPDATE public.bills
SET paid_amount = 3200, status = 'paid', updated_at = now()
WHERE id = 'ad96e15b-3043-4aee-a925-44f7a33d10ef';

UPDATE public.payment_requests
SET amount = 3200, review_note = COALESCE(review_note, '') || ' [auto-corrected: original 3500 included bKash fee, society income is 3200]'
WHERE id = '97f9f612-24a6-4623-807e-f90563d5360d';