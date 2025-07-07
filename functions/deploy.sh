firebase deploy
gcloud functions add-iam-policy-binding api \
  --region=us-central1 \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker"