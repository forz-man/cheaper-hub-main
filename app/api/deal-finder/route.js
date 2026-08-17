import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabaseAdmin";

// Initialize OpenAI (it automatically picks up process.env.OPENAI_API_KEY)
const openai = new OpenAI();

export async function POST(req) {
  try {
    const { query } = await req.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Search query is required." }, { status: 400 });
    }

    // 1. Invoke the LLM to find deals
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Use gpt-4o for fast, accurate JSON structuring
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert Deal Discovery Agent. Your goal is to find the best available deals for the user's search query.
Search across major online retailers (Amazon, Walmart, Best Buy, Target, Newegg, etc.) and return up to 10 of the best deals you find.

For each deal, you MUST provide the following structured information:
- product_name (string)
- brand (string)
- retailer (string)
- price (number, the current selling price)
- original_price (number, the 'was' or 'list' price, if available. Otherwise, use the current price)
- product_url (string, a direct link to the product page)
- image_url (string, a direct link to a high-quality product image)
- is_in_stock (boolean)
- category (string, one of: Electronics, Fashion, Home & Garden, Sports & Outdoors, Books, Health & Beauty, Toys & Games, Automotive, Food & Grocery, Office Supplies)

Return a JSON object with a single key "deals" containing an array of these deal objects.
If you cannot find any deals, return an empty array.`
        },
        {
          role: "user",
          content: `Find me deals for: "${query}"`
        }
      ]
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content);
    
    if (!aiResponse || !aiResponse.deals || aiResponse.deals.length === 0) {
      return NextResponse.json({ deals: [] }, { status: 200 });
    }

    // Filter out out-of-stock items immediately
    const foundDeals = aiResponse.deals.filter(d => d.is_in_stock);
    let allDeals = [];

    // Initialize the admin client to bypass RLS for backend data ingestion
    const admin = createAdminClient();

    // 2. Process and save the deals to Supabase
    for (const deal of foundDeals) {
      // Handle Canonical Product
      let canonicalProductId;
      const { data: existingProducts } = await admin
        .from("canonical_products")
        .select("id")
        .eq("product_name", deal.product_name)
        .eq("brand", deal.brand)
        .limit(1);

      if (existingProducts && existingProducts.length > 0) {
        canonicalProductId = existingProducts[0].id;
      } else {
        const { data: newProduct, error: productErr } = await admin
          .from("canonical_products")
          .insert({ product_name: deal.product_name, brand: deal.brand })
          .select("id")
          .single();
          
        if (productErr) {
          console.error("Error creating canonical product:", productErr);
          continue; // Skip this deal if we can't map it
        }
        canonicalProductId = newProduct.id;
      }

      // Fetch existing deals for this canonical product to check for duplicates
      const { data: existingDealsInDB } = await admin
        .from("deals")
        .select("*")
        .eq("canonical_product_id", canonicalProductId);

      if (existingDealsInDB) {
        allDeals.push(...existingDealsInDB);
      }

      // Calculate discount
      const originalPrice = deal.original_price || deal.price;
      let discountPercentage = 0;
      if (originalPrice && originalPrice > 0 && deal.price < originalPrice) {
        discountPercentage = ((originalPrice - deal.price) / originalPrice) * 100;
      }

      // Check if this specific URL has already been scraped
      const isDuplicate = existingDealsInDB?.some(dbDeal => dbDeal.product_url === deal.product_url);
      
      if (!isDuplicate) {
        const newDeal = {
          product_name: deal.product_name,
          retailer: deal.retailer,
          original_price: originalPrice,
          discounted_price: deal.price,
          discount_percentage: discountPercentage,
          product_url: deal.product_url,
          image_url: deal.image_url,
          deal_type: 'direct_match',
          verification_status: 'pending', // Requires admin verification
          search_query: query,
          canonical_product_id: canonicalProductId,
          community_score: 0,
          category: deal.category || 'Electronics'
        };

        const { data: createdDeal, error: dealErr } = await admin
          .from("deals")
          .insert(newDeal)
          .select()
          .single();

        if (dealErr) {
          console.error("Error saving deal:", dealErr);
        } else if (createdDeal) {
          allDeals.push(createdDeal);
        }
      }
    }

    // 3. Sort and return unique deals to the frontend
    const uniqueDeals = Array.from(new Map(allDeals.map(d => [d.id, d])).values());
    uniqueDeals.sort((a, b) => b.community_score - a.community_score || a.discounted_price - b.discounted_price);

    return NextResponse.json({ deals: uniqueDeals }, { status: 200 });

  } catch (error) {
    console.error("Deal Finder API Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while searching for deals." },
      { status: 500 }
    );
  }
}