import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_KEY")!
    )

    const form = await req.formData()

    const id = Number(form.get("id"))
    const name = form.get("name")?.toString() || ""
    const description = form.get("description")?.toString() || ""
    const price = Number(form.get("price") || 0)
    const category = form.get("category")?.toString() || "General"
    const is_offer = form.get("is_offer") === "true"
    const offer_price = Number(form.get("offer_price") || 0)

    const image = form.get("image") as File | null
    let image_url = form.get("current_image")?.toString() || null

    // Si hay imagen nueva, la subimos
    if (image) {
      const ext = image.name.split(".").pop()
      const fileName = `${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(fileName, image, {
          contentType: image.type,
        })

      if (uploadError) {
        return new Response(JSON.stringify({ error: uploadError }), {
          status: 500,
        })
      }

      const { data: publicUrl } = supabase.storage
        .from("products")
        .getPublicUrl(fileName)

      image_url = publicUrl.publicUrl
    }

    const { data, error } = await supabase
      .from("products")
      .update({
        name,
        description,
        price,
        category,
        is_offer,
        offer_price,
        image_url,
      })
      .eq("id", id)
      .select()

    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500 })
    }

    return new Response(JSON.stringify(data[0]), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    })
  }
})
