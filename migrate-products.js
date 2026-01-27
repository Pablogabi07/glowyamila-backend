import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  "https://kloliqzkdsegsutubzoh.supabase.co",
  "sb_secret_LBaivNLA6DOJEmkxEC5TkQ_Or0vczEV"
)

const data = JSON.parse(fs.readFileSync("./products.json", "utf8"))
const products = data.products

async function migrate() {
  for (const p of products) {
    console.log("Migrando:", p.name)

    let image_url = null

    if (p.imageUrl) {
      const filePath = path.join("./uploads", p.imageUrl.replace("/uploads/", ""))
      const fileBuffer = fs.readFileSync(filePath)
      const fileName = `${Date.now()}-${p.id}.jpeg`

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(fileName, fileBuffer, {
          contentType: "image/jpeg"
        })

      if (uploadError) {
        console.log("Error subiendo imagen:", uploadError)
      } else {
        const { data: publicUrl } = supabase.storage
          .from("products")
          .getPublicUrl(fileName)

        image_url = publicUrl.publicUrl
      }
    }

    const { error } = await supabase.from("products").insert({
      name: p.name,
      description: p.description,
      price: p.price,
      category: p.category,
      is_offer: p.isOffer,
      offer_price: p.offerPrice,
      image_url,
      active: p.active
    })

    if (error) console.log("Error insertando:", error)
  }

  console.log("Migración completa.")
}

migrate()
