CREATE OR REPLACE FUNCTION reorder_segments(
  p_construct_id  uuid,
  p_segment_ids   uuid[]
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_db_count INTEGER;
  v_input_count INTEGER;
  v_unique_count INTEGER;
BEGIN
  -- Ensure we're in a transaction with deferred constraints
  SET CONSTRAINTS construct_segment_order_order_idx_key DEFERRED;
  
  -- Check if construct exists
  IF NOT EXISTS (SELECT 1 FROM constructs WHERE id = p_construct_id) THEN
    RAISE EXCEPTION 'Construct not found';
  END IF;

  -- Get counts for validation
  SELECT COUNT(*) INTO v_db_count
  FROM construct_segment_order
  WHERE construct_id = p_construct_id;
  
  v_input_count := array_length(p_segment_ids, 1);
  
  -- Check for null or empty array
  IF v_input_count IS NULL OR v_input_count = 0 THEN
    RAISE EXCEPTION 'Segment list cannot be empty';
  END IF;
  
  -- Check for duplicates in input
  SELECT COUNT(DISTINCT segment_id) INTO v_unique_count
  FROM unnest(p_segment_ids) AS segment_id;
  
  IF v_unique_count != v_input_count THEN
    RAISE EXCEPTION 'Duplicate segments in input array';
  END IF;
  
  -- Check if counts match
  IF v_db_count != v_input_count THEN
    RAISE EXCEPTION 'Segment count mismatch: expected %, got %', v_db_count, v_input_count;
  END IF;
  
  -- Check if all input segments exist in DB for this construct
  IF EXISTS (
    SELECT 1
    FROM unnest(p_segment_ids) AS sid
    WHERE NOT EXISTS (
      SELECT 1 
      FROM construct_segment_order 
      WHERE construct_id = p_construct_id AND segment_id = sid
    )
  ) THEN
    RAISE EXCEPTION 'Invalid segment IDs provided - some segments do not belong to this construct';
  END IF;

  -- METHOD 1: Using array_position (cleaner, requires PG 9.5+)
  UPDATE construct_segment_order
  SET order_idx = array_position(p_segment_ids, segment_id) - 1  -- zero-indexed
  WHERE construct_id = p_construct_id;
  
  -- Update the construct's updated_at timestamp
  UPDATE constructs
  SET updated_at = NOW()
  WHERE id = p_construct_id;
END;
$$;

-- Alternative if array_position doesn't work or deferred constraints aren't helping
CREATE OR REPLACE FUNCTION reorder_segments_with_temp_table(
  p_construct_id  uuid,
  p_segment_ids   uuid[]
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_db_count INTEGER;
  v_input_count INTEGER;
BEGIN
  -- Validation (simplified for brevity)
  IF NOT EXISTS (SELECT 1 FROM constructs WHERE id = p_construct_id) THEN
    RAISE EXCEPTION 'Construct not found';
  END IF;
  
  v_input_count := array_length(p_segment_ids, 1);
  IF v_input_count IS NULL OR v_input_count = 0 THEN
    RAISE EXCEPTION 'Segment list cannot be empty';
  END IF;

  -- Create a temp table with the new order
  CREATE TEMP TABLE new_order AS
  SELECT 
    unnest(p_segment_ids) AS segment_id,
    generate_series(0, array_length(p_segment_ids, 1) - 1) AS order_idx;
  
  -- Update from the temp table
  UPDATE construct_segment_order cso
  SET order_idx = no.order_idx
  FROM new_order no
  WHERE cso.construct_id = p_construct_id
    AND cso.segment_id = no.segment_id;
  
  -- Clean up
  DROP TABLE new_order;
END;
$$;