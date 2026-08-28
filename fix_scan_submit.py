import os

path = "app/scan/page.tsx"
if os.path.exists(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace handleSubmit to leverage the centralized submitPatrolScan utility
    old_handle_submit_block = """  const handleSubmit = async () => {
    if (!scannedCode) return alert('Please scan a QR code first!');
    setSubmitting(true);
    try {
      const isIncident = patrolStatus === 'INCIDENT';
      const payload: any = {
        checkpoint_id: scannedCode,
        guard_id: '2615876d-0614-48d9-9efc-d710bd8b476d',
        status: isIncident ? 'incident' : 'verified',"""

    new_handle_submit_block = """  const handleSubmit = async () => {
    if (!scannedCode) return alert('Please scan a QR code first!');
    setSubmitting(true);
    try {
      const isIncident = patrolStatus === 'INCIDENT';
      
      // Submit via shared helper to ensure all names, media attachments, and geofence data populate Live Feed 32
      await submitPatrolScan({
        guardName: 'Tobi',
        locationName: 'Multichoice - Customer hall',
        checkpointName: scannedCode,
        isIncident,
        notes: notes || (isIncident ? 'Incident reported' : 'Normal Patrol Verification'),
        mediaUrl: mediaUrl || null"""

    if "checkpoint_id: scannedCode" in content:
        content = content.replace("import { supabase } from '@/lib/supabase';", "import { supabase, submitPatrolScan } from '@/lib/supabase';")
        # Replace the submission block safely
        print("Patching handleSubmit in app/scan/page.tsx...")
    
    # Alternatively, overwrite handleSubmit block directly using regex or string replacement
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
