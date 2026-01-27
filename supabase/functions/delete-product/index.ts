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

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing product ID" }), {
        status: 400,
      })
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)

    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    })
  }
})
