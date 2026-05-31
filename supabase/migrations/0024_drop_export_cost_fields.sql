-- Export bookings no longer track the Trucking, Domestic Cost, Customs Processing,
-- Shipping Line Cost, Port Charges Cost, and Miscellaneous Cost categories.
-- These fields lived only in the `data` JSONB passthrough (no dedicated columns),
-- so cleanup is a key-strip on existing EXPORT rows in `bookings` and their segments.
-- New bookings are already clean (the create form no longer sends these keys).

-- Keys removed: loadingAddress, loadingSchedule, domesticFreight, hustlingStripping,
-- forkliftOperator, exportDivision, lodgmentCdsFee, formE, oceanFreight, sealFee,
-- docsFee, lssFee, storageCost, arrastre, shutOut, royaltyFee, lona, lalamove, bir,
-- labor, otherCharges.

update bookings
set data = data - ARRAY[
  'loadingAddress','loadingSchedule',
  'domesticFreight','hustlingStripping','forkliftOperator',
  'exportDivision','lodgmentCdsFee','formE',
  'oceanFreight','sealFee','docsFee','lssFee','storageCost',
  'arrastre','shutOut',
  'royaltyFee','lona','lalamove','bir','labor','otherCharges'
]::text[]
where movement = 'EXPORT' and data is not null;

update booking_segments
set data = data - ARRAY[
  'loadingAddress','loadingSchedule',
  'domesticFreight','hustlingStripping','forkliftOperator',
  'exportDivision','lodgmentCdsFee','formE',
  'oceanFreight','sealFee','docsFee','lssFee','storageCost',
  'arrastre','shutOut',
  'royaltyFee','lona','lalamove','bir','labor','otherCharges'
]::text[]
where data is not null
  and booking_id in (select id from bookings where movement = 'EXPORT');
