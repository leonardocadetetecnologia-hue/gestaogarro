-- Tipo da demanda na esteira. Fica vazio nas demandas anteriores, que continuam classificadas pelo nome.
CREATE TYPE "DemandMediaType" AS ENUM ('VIDEO', 'FOTO', 'FOTO_E_VIDEO');

ALTER TABLE "Demand" ADD COLUMN "mediaType" "DemandMediaType";
