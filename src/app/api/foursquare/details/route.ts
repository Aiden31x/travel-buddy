// /app/api/foursquare/details/route.ts
export async function GET(req: Request) {
    try {
      const { searchParams } = new URL(req.url);
      const fsq_place_id = searchParams.get("fsq_place_id");
  
      if (!fsq_place_id) {
        return new Response(JSON.stringify({ error: "Missing fsq_place_id parameter" }), { status: 400 });
      }
  
      const url = `https://places-api.foursquare.com/places/${fsq_place_id}?fields=fsq_place_id,name,latitude,longitude,location,categories,rating,price,hours,website,tel,email,description,photos,attributes`;
  
      console.log('Details request to:', url);
  
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.FOURSQUARE_SERVICE_KEY!}`,
          Accept: "application/json",
          "X-Places-Api-Version": "2025-06-17",
        },
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Foursquare API error: ${response.status} - ${errorText}`);
        throw new Error(`Foursquare API error: ${response.status} - ${errorText}`);
      }
  
      const data = await response.json();
      
      const placeDetails = {
        id: data.fsq_place_id,
        name: data.name,
        lat: data.latitude?.toString(),
        lon: data.longitude?.toString(),
        categories: data.categories || [],
        rating: data.rating,
        price: data.price,
        address: {
          formatted_address: data.location?.formatted_address,
          street: data.location?.address,
          city: data.location?.locality,
          state: data.location?.region,
          country: data.location?.country,
          postcode: data.location?.postcode,
        },
        hours: data.hours,
        website: data.website,
        tel: data.tel,
        email: data.email,
        description: data.description,
        photos: data.photos,
        attributes: data.attributes,
      };
  
      return new Response(JSON.stringify({
        details: placeDetails,
      }), { status: 200 });
  
    } catch (err: any) {
      console.error('Details error:', err);
      return new Response(JSON.stringify({ 
        error: err.message,
        type: 'details_error'
      }), { status: 500 });
    }
  }