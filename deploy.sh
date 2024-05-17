# Despliega y promueve la nueva versión
gcloud app deploy --promote --quiet --project sincere-stack-421919

# Obtén la lista de todas las versiones, excluyendo la versión activa
OLD_VERSIONS=$(gcloud app versions list --format="value(version.id)" --filter="TRAFFIC_SPLIT=0")

# Detiene y luego elimina las versiones antiguas
for VERSION in $OLD_VERSIONS
do
  echo "Deteniendo versión: $VERSION..."
  gcloud app versions stop $VERSION --quiet
  echo "Eliminando versión: $VERSION..."
  gcloud app versions delete $VERSION --quiet
done

