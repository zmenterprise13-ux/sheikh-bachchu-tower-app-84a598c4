DELETE FROM public.payment_requests
WHERE id IN (
  'b54df777-01d6-45c9-bbd6-2088013edac8',
  '9a3a0fdd-6ab5-4d58-8174-da95c68c6423',
  'cc06a8d8-50c4-483e-8eae-91ae11b355f9',
  '08030ed8-5585-4015-9b10-7f7c6e887d01',
  'd1783c9e-3d42-43d2-a714-a539a8d364d2',
  '91467c64-0304-4632-a16a-8282a50a3b34',
  '96899049-beab-44fe-9c5b-c17eb37ebe87',
  '591a5d48-d012-423e-b062-1348d4b3a803'
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_requests_one_active_per_bill
ON public.payment_requests (bill_id)
WHERE status IN ('pending','reviewed');