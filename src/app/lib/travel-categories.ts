// /lib/travel-categories.ts

export interface CategoryConfig {
    id: string;
    name: string;
    icon: string;
    description: string;
    osmQueries: string[];
    color: string;
  }
  
  export interface CategoryGroup {
    groupId: string;
    groupName: string;
    icon: string;
    categories: CategoryConfig[];
  }
  
  export const TRAVEL_CATEGORIES: CategoryGroup[] = [
    {
      groupId: 'eat_drink',
      groupName: 'Eat & Drink',
      icon: '🍽️',
      categories: [
        {
          id: 'restaurants',
          name: 'Restaurants',
          icon: '🍽️',
          description: 'Dining establishments and restaurants',
          osmQueries: ['amenity=restaurant'],
          color: '#ef4444'
        },
        {
          id: 'cafes',
          name: 'Cafes',
          icon: '☕',
          description: 'Coffee shops and cafes',
          osmQueries: ['amenity=cafe'],
          color: '#8b5cf6'
        },
        {
          id: 'fast_food',
          name: 'Fast Food',
          icon: '🍟',
          description: 'Quick service restaurants',
          osmQueries: ['amenity=fast_food'],
          color: '#f59e0b'
        },
        {
          id: 'pubs_bars',
          name: 'Pubs & Bars',
          icon: '🍺',
          description: 'Pubs, bars, and drinking establishments',
          osmQueries: ['amenity=pub', 'amenity=bar', 'amenity=biergarten'],
          color: '#10b981'
        },
        {
          id: 'ice_cream',
          name: 'Ice Cream',
          icon: '🍦',
          description: 'Ice cream shops and gelaterias',
          osmQueries: ['amenity=ice_cream'],
          color: '#ec4899'
        }
      ]
    },
    {
      groupId: 'accommodation',
      groupName: 'Stay',
      icon: '🏨',
      categories: [
        {
          id: 'hotels',
          name: 'Hotels',
          icon: '🏨',
          description: 'Hotels and luxury accommodations',
          osmQueries: ['tourism=hotel'],
          color: '#3b82f6'
        },
        {
          id: 'hostels',
          name: 'Hostels',
          icon: '🏠',
          description: 'Budget accommodations and hostels',
          osmQueries: ['tourism=hostel'],
          color: '#06b6d4'
        },
        {
          id: 'guest_houses',
          name: 'Guest Houses',
          icon: '🏡',
          description: 'Guest houses and B&Bs',
          osmQueries: ['tourism=guest_house'],
          color: '#84cc16'
        },
        {
          id: 'camping',
          name: 'Camping',
          icon: '⛺',
          description: 'Campsites and RV parks',
          osmQueries: ['tourism=camp_site', 'tourism=caravan_site'],
          color: '#22c55e'
        }
      ]
    },
    {
      groupId: 'attractions',
      groupName: 'Attractions & Leisure',
      icon: '🎭',
      categories: [
        {
          id: 'tourist_attractions',
          name: 'Tourist Attractions',
          icon: '🎯',
          description: 'Popular tourist attractions and landmarks',
          osmQueries: ['tourism=attraction'],
          color: '#ef4444'
        },
        {
          id: 'museums',
          name: 'Museums',
          icon: '🏛️',
          description: 'Museums and cultural institutions',
          osmQueries: ['tourism=museum'],
          color: '#8b5cf6'
        },
        {
          id: 'galleries',
          name: 'Art Galleries',
          icon: '🎨',
          description: 'Art galleries and exhibitions',
          osmQueries: ['tourism=gallery'],
          color: '#ec4899'
        },
        {
          id: 'entertainment',
          name: 'Entertainment',
          icon: '🎪',
          description: 'Zoos, aquariums, theme parks',
          osmQueries: ['tourism=zoo', 'tourism=aquarium', 'tourism=theme_park'],
          color: '#f59e0b'
        },
        {
          id: 'viewpoints',
          name: 'Viewpoints',
          icon: '🌄',
          description: 'Scenic viewpoints and lookouts',
          osmQueries: ['tourism=viewpoint'],
          color: '#06b6d4'
        },
        {
          id: 'parks_nature',
          name: 'Parks & Nature',
          icon: '🌳',
          description: 'Parks, gardens, and natural areas',
          osmQueries: ['leisure=park', 'leisure=garden', 'natural=beach'],
          color: '#22c55e'
        },
        {
          id: 'historical',
          name: 'Historical Sites',
          icon: '🏰',
          description: 'Historical landmarks and monuments',
          osmQueries: ['historic=monument', 'historic=memorial', 'historic=castle', 'historic=ruins', 'historic=archaeological_site'],
          color: '#92400e'
        },
        {
          id: 'entertainment_venues',
          name: 'Entertainment Venues',
          icon: '🎭',
          description: 'Theatres, cinemas, and performance venues',
          osmQueries: ['amenity=theatre', 'amenity=cinema'],
          color: '#7c3aed'
        }
      ]
    },
    {
      groupId: 'shopping',
      groupName: 'Shopping',
      icon: '🛍️',
      categories: [
        {
          id: 'malls',
          name: 'Shopping Malls',
          icon: '🏢',
          description: 'Shopping centers and malls',
          osmQueries: ['shop=mall', 'building=commercial'],
          color: '#3b82f6'
        },
        {
          id: 'supermarkets',
          name: 'Supermarkets',
          icon: '🛒',
          description: 'Grocery stores and supermarkets',
          osmQueries: ['shop=supermarket'],
          color: '#10b981'
        },
        {
          id: 'convenience',
          name: 'Convenience Stores',
          icon: '🏪',
          description: 'Convenience stores and mini marts',
          osmQueries: ['shop=convenience'],
          color: '#f59e0b'
        },
        {
          id: 'souvenirs',
          name: 'Souvenirs & Gifts',
          icon: '🎁',
          description: 'Souvenir shops and gift stores',
          osmQueries: ['shop=gift', 'shop=souvenir'],
          color: '#ec4899'
        },
        {
          id: 'bakeries',
          name: 'Bakeries',
          icon: '🥖',
          description: 'Bakeries and pastry shops',
          osmQueries: ['shop=bakery'],
          color: '#92400e'
        },
        {
          id: 'markets',
          name: 'Markets',
          icon: '🏪',
          description: 'Local markets and marketplaces',
          osmQueries: ['amenity=marketplace'],
          color: '#059669'
        }
      ]
    },
    {
      groupId: 'transport',
      groupName: 'Transport',
      icon: '🚇',
      categories: [
        {
          id: 'train_stations',
          name: 'Train Stations',
          icon: '🚂',
          description: 'Railway and train stations',
          osmQueries: ['railway=station'],
          color: '#3b82f6'
        },
        {
          id: 'metro_subway',
          name: 'Metro/Subway',
          icon: '🚇',
          description: 'Metro and subway stations',
          osmQueries: ['railway=subway_entrance', 'station=subway'],
          color: '#8b5cf6'
        },
        {
          id: 'bus_stops',
          name: 'Bus Stops',
          icon: '🚌',
          description: 'Bus stops and terminals',
          osmQueries: ['highway=bus_stop', 'amenity=bus_station'],
          color: '#f59e0b'
        },
        {
          id: 'airports',
          name: 'Airports',
          icon: '✈️',
          description: 'Airports and airfields',
          osmQueries: ['aeroway=aerodrome'],
          color: '#06b6d4'
        },
        {
          id: 'ferry',
          name: 'Ferry Terminals',
          icon: '⛴️',
          description: 'Ferry terminals and water transport',
          osmQueries: ['amenity=ferry_terminal'],
          color: '#0891b2'
        },
        {
          id: 'car_rental',
          name: 'Car Rental',
          icon: '🚗',
          description: 'Car rental agencies',
          osmQueries: ['amenity=car_rental'],
          color: '#dc2626'
        },
        {
          id: 'bike_rental',
          name: 'Bike Rental',
          icon: '🚲',
          description: 'Bicycle rental stations',
          osmQueries: ['amenity=bicycle_rental'],
          color: '#16a34a'
        }
      ]
    },
    {
      groupId: 'safety_health',
      groupName: 'Safety & Health',
      icon: '⛑️',
      categories: [
        {
          id: 'hospitals',
          name: 'Hospitals',
          icon: '🏥',
          description: 'Hospitals and medical centers',
          osmQueries: ['amenity=hospital'],
          color: '#dc2626'
        },
        {
          id: 'clinics',
          name: 'Clinics',
          icon: '🏥',
          description: 'Medical clinics and health centers',
          osmQueries: ['amenity=clinic', 'amenity=doctors'],
          color: '#f97316'
        },
        {
          id: 'pharmacies',
          name: 'Pharmacies',
          icon: '💊',
          description: 'Pharmacies and drugstores',
          osmQueries: ['amenity=pharmacy'],
          color: '#22c55e'
        },
        {
          id: 'police',
          name: 'Police Stations',
          icon: '👮',
          description: 'Police stations and law enforcement',
          osmQueries: ['amenity=police'],
          color: '#1d4ed8'
        },
        {
          id: 'atms',
          name: 'ATMs',
          icon: '🏧',
          description: 'ATMs and cash machines',
          osmQueries: ['amenity=atm'],
          color: '#059669'
        },
        {
          id: 'banks',
          name: 'Banks',
          icon: '🏦',
          description: 'Banks and financial services',
          osmQueries: ['amenity=bank'],
          color: '#0369a1'
        }
      ]
    }
  ];
  
  // Helper functions
  export function getCategoryById(categoryId: string): CategoryConfig | undefined {
    for (const group of TRAVEL_CATEGORIES) {
      const category = group.categories.find(cat => cat.id === categoryId);
      if (category) return category;
    }
    return undefined;
  }
  
  export function getCategoriesByGroup(groupId: string): CategoryConfig[] {
    const group = TRAVEL_CATEGORIES.find(g => g.groupId === groupId);
    return group?.categories || [];
  }
  
  export function getAllCategories(): CategoryConfig[] {
    return TRAVEL_CATEGORIES.flatMap(group => group.categories);
  }
  
  export function buildOverpassQuery(categoryId: string, lat: number, lon: number, radius: number): string {
    const category = getCategoryById(categoryId);
    if (!category) {
      throw new Error(`Category '${categoryId}' not found`);
    }
  
    const queries = category.osmQueries.map(osmQuery => {
      return `
        node["${osmQuery.split('=')[0]}"="${osmQuery.split('=')[1]}"](around:${radius},${lat},${lon});
        way["${osmQuery.split('=')[0]}"="${osmQuery.split('=')[1]}"](around:${radius},${lat},${lon});
        relation["${osmQuery.split('=')[0]}"="${osmQuery.split('=')[1]}"](around:${radius},${lat},${lon});
      `.trim();
    }).join('\n');
  
    return `
      [out:json][timeout:30][maxsize:1073741824];
      (
        ${queries}
      );
      out center meta 50;
    `.trim();
  }