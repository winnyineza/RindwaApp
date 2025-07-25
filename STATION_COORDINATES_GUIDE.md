# 🔍 Station Location Search Guide

## 🎯 Why Location Search Matters

Using the **intelligent location search** for your emergency stations enables:

✅ **Automatic Incident Assignment** - System assigns incidents to nearest station  
✅ **Faster Response Times** - Emergency teams get routed optimally  
✅ **Distance Calculations** - Real-time proximity analysis  
✅ **Geographic Analytics** - Coverage area insights  

## 🗺️ How to Use Location Search

### Smart Search Feature

The station creation form now includes an **intelligent search box** that:

1. **Search by Name** - Type the station or landmark name
2. **Auto-Complete** - Get suggestions as you type
3. **Coordinate Detection** - Automatically finds lat/lng coordinates
4. **Address Auto-Fill** - Populates the address field automatically

### Search Examples

**Type any of these in the search box:**

✅ **"Remera Police Station"** - Specific station names  
✅ **"Kigali City Center"** - Central locations  
✅ **"Gasabo District Office"** - Government buildings  
✅ **"MTN Center Nyarutarama"** - Business landmarks  
✅ **"University of Rwanda"** - Educational institutions  
✅ **"King Faisal Hospital"** - Medical facilities  

### How It Works

1. **Type your search** in the "Station Location Search" box
2. **Press Enter** or click the search button
3. **Select from results** - Choose the most accurate location
4. **Automatic population** - Coordinates and address auto-fill
5. **Visual confirmation** - See the selected location details

### Dual Mode Operation

**🌐 With Google Maps API** (Enhanced):
- Real-time Google Places search
- Detailed address information
- Multiple result options
- High accuracy coordinates

**📍 Without API** (Offline Mode):
- Built-in Rwanda location database
- Common landmarks and districts
- Fast local search
- Reliable fallback system

## 📋 Coordinate Format

**Latitude Range**: `-90` to `90` (Rwanda: approximately `-1` to `-3`)  
**Longitude Range**: `-180` to `180` (Rwanda: approximately `28` to `31`)  

**Rwanda-specific examples:**
- **Kigali Center**: `-1.9441, 30.0619`
- **Gasabo District**: `-1.9355, 30.0928`
- **Nyarugenge**: `-1.9536, 30.0588`

## ⚡ Enhanced Google Maps Integration (Optional)

For a **fully interactive map experience** during station creation, you can set up Google Maps API:

### 1. Get Google Maps API Key
- Visit [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or select existing
- Enable **Maps JavaScript API**
- Create credentials and get your API key

### 2. Configure Environment
Create a `.env` file in your project root:
```env
VITE_GOOGLE_MAPS_API_KEY=your-api-key-here
```

### 3. Restart Development Server
```bash
npm run dev
```

### 4. Enhanced Features Available
- **Interactive map picker**
- **Drag-and-drop marker placement**
- **Address auto-completion**
- **Visual location confirmation**

## 🚨 Incident Assignment Logic

Once coordinates are set, the system automatically:

1. **Analyzes incident location** (when coordinates provided)
2. **Calculates distances** to all active stations
3. **Considers station capacity** and equipment level
4. **Routes to optimal station** based on proximity and availability
5. **Provides ETA estimates** for response teams

## 🌍 Rwanda Coverage Areas

**Common Districts and Approximate Centers:**

| District | Latitude | Longitude |
|----------|----------|-----------|
| Gasabo | -1.9355 | 30.0928 |
| Kicukiro | -1.9667 | 30.1028 |
| Nyarugenge | -1.9536 | 30.0588 |
| Musanze | -1.4994 | 29.6352 |
| Huye | -2.5967 | 29.7385 |
| Rubavu | -1.6783 | 29.2602 |

## 💡 Best Practices

✅ **Use precise coordinates** - Get as close as possible to station entrance  
✅ **Double-check coordinates** - Verify location on map before saving  
✅ **Update when relocating** - Keep coordinates current if station moves  
✅ **Test assignment** - Create test incident to verify routing works  

## 🔧 Troubleshooting

**Issue**: Station not getting assigned incidents  
**Solution**: Verify coordinates are correct and station is marked as "Active"

**Issue**: Wrong station getting assigned  
**Solution**: Check coordinates accuracy - small errors can affect routing

**Issue**: Can't find coordinates  
**Solution**: Use the address to search on Google Maps, then get coordinates

---

**🎯 Goal**: Every station should have precise coordinates for optimal emergency response routing! 