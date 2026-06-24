# Crop Disease Treatment Data

treatments = {
    # APPLE
    "Apple___Apple_scab": {
        "disease": "Apple Scab",
        "crop": "Apple",
        "cause": "Venturia inaequalis (fungus)",
        "symptoms": "Olive-green to black velvety spots on leaves; leaves turn yellow and drop early. Fruit develops scabby, brown lesions.",
        "organic": "Apply sulfur or copper fungicides in early spring. Rake and destroy fallen leaves to reduce overwintering spores.",
        "chemical": "Use fungicides containing Captan, Myclobutanil, or Mancozeb as per local guidelines.",
        "prevention": "Plant resistant cultivars. Prune trees to improve air circulation. Clean orchard debris in autumn."
    },
    "Apple___Black_rot": {
        "disease": "Black Rot",
        "crop": "Apple",
        "cause": "Botryosphaeria obtusa (fungus)",
        "symptoms": "Frogeye leaf spots (brown with purple margins). Fruit develops rotting spots with concentric rings, turning completely black and mummified.",
        "organic": "Prune out dead wood, cankers, and remove mummified fruit. Apply copper spray during green tip stage.",
        "chemical": "Fungicides like Thiophanate-methyl, Captan, or Fludioxonil.",
        "prevention": "Control insect pests that damage fruit. Prune regularly during dry winter periods to minimize open wounds."
    },
    "Apple___Cedar_apple_rust": {
        "disease": "Cedar Apple Rust",
        "crop": "Apple",
        "cause": "Gymnosporangium juniperi-virginianae (fungus)",
        "symptoms": "Bright orange-yellow spots on the upper leaf surface, followed by tiny tube-like structures (aecia) on the underside of leaves.",
        "organic": "Remove nearby juniper/red cedar trees if possible. Spray copper-based fungicides when apple buds begin to break.",
        "chemical": "Apply Myclobutanil (Immunox) or Propiconazole at pre-bloom and petal fall stages.",
        "prevention": "Grow rust-resistant apple varieties. Protect leaves from early spring through early summer when spores are flying."
    },
    "Apple___healthy": {
        "disease": "Healthy",
        "crop": "Apple",
        "cause": "None",
        "symptoms": "Leaves are vibrant green with no lesions or abnormalities. Fruit is firm and uniform.",
        "organic": "Continue organic compost feeding, regular watering, and companion planting.",
        "chemical": "No chemical treatments needed.",
        "prevention": "Ensure good spacing, prune annually, and monitor for early signs of pests or disease."
    },

    # BLUEBERRY
    "Blueberry___healthy": {
        "disease": "Healthy",
        "crop": "Blueberry",
        "cause": "None",
        "symptoms": "Leaves are smooth, green, and show healthy growth. Stems are clear of cankers.",
        "organic": "Maintain acidic soil (pH 4.5-5.2) with pine needle mulch and organic compost.",
        "chemical": "No chemical treatments needed.",
        "prevention": "Prune old canes annually and water consistently at the roots."
    },

    # CHERRY
    "Cherry_(including_sour)___Powdery_mildew": {
        "disease": "Powdery Mildew",
        "crop": "Cherry",
        "cause": "Podosphaera clandestina (fungus)",
        "symptoms": "White, powdery fungal patches on leaves and twigs. Leaves may curl, become distorted, and drop prematurely.",
        "organic": "Apply neem oil, potassium bicarbonate, or sulfur sprays. Avoid overhead watering.",
        "chemical": "Fungicides containing Myclobutanil, Fenarimol, or Triadimefon.",
        "prevention": "Prune canopy to increase sunlight penetration and air movement. Remove sucker growth."
    },
    "Cherry_(including_sour)___healthy": {
        "disease": "Healthy",
        "crop": "Cherry",
        "cause": "None",
        "symptoms": "Vibrant leaves and clean branches. Fruit is glossy and plump.",
        "organic": "Feed with organic compost and compost tea. Mulch around the drip line.",
        "chemical": "No chemical treatments needed.",
        "prevention": "Ensure good drainage, annual pruning, and clear fallen leaves in winter."
    },

    # CORN (MAIZE)
    "Corn_(maize)___Cercospora_leaf_spot_Gray_leaf_spot": {
        "disease": "Gray Leaf Spot",
        "crop": "Corn (Maize)",
        "cause": "Cercospora zeae-maydis (fungus)",
        "symptoms": "Long, rectangular, gray-to-tan necrotic lesions running parallel to leaf veins. Can lead to severe leaf blight.",
        "organic": "Rotate crops with non-hosts like soybeans. Plow under crop debris to encourage decay of fungus.",
        "chemical": "Apply strobilurin or triazole fungicides early in the infection cycle (VT/R1 stages).",
        "prevention": "Use disease-resistant hybrids. Avoid continuous corn planting in the same field."
    },
    "Corn_(maize)___Common_rust_": {
        "disease": "Common Rust",
        "crop": "Corn (Maize)",
        "cause": "Puccinia sorghi (fungus)",
        "symptoms": "Powdery, reddish-brown pustules on both upper and lower leaf surfaces. Heavy infection causes leaves to yellow and die.",
        "organic": "Plant rust-resistant hybrids. Avoid overhead irrigation to minimize leaf wetness.",
        "chemical": "Apply preventative fungicides like Pyraclostrobin or Azoxystrobin if early infection is severe.",
        "prevention": "Sow early to escape high spore counts in late summer. Manage weeds."
    },
    "Corn_(maize)___Northern_Leaf_Blight": {
        "disease": "Northern Leaf Blight",
        "crop": "Corn (Maize)",
        "cause": "Exserohilum turcicum (fungus)",
        "symptoms": "Long, cigar-shaped, grayish-green or tan lesions on leaves. Lesions can merge, causing leaf death.",
        "organic": "Incorporate crop residue deeply into the soil. Practice crop rotation.",
        "chemical": "Apply Propiconazole, Azoxystrobin, or Pyraclostrobin during the early vegetative stages.",
        "prevention": "Plant resistant hybrids and manage field residue to reduce overwintering spore loads."
    },
    "Corn_(maize)___healthy": {
        "disease": "Healthy",
        "crop": "Corn (Maize)",
        "cause": "None",
        "symptoms": "Broad, green, upright leaves. Strong stalks and healthy ears.",
        "organic": "Maintain nitrogen-rich soil with crop rotation and cover cropping (e.g., clover).",
        "chemical": "No chemical treatments needed.",
        "prevention": "Regular scouting, balance soil nutrients, and ensure optimal plant population spacing."
    },

    # GRAPE
    "Grape___Black_rot": {
        "disease": "Black Rot",
        "crop": "Grape",
        "cause": "Guignardia bidwellii (fungus)",
        "symptoms": "Small, round, tan spots on leaves with dark borders. Grapes shrivel, turn black, and form dry, wrinkled 'mummies'.",
        "organic": "Remove and destroy all mummified berries and infected canes. Apply copper sprays early.",
        "chemical": "Use Mancozeb, Captan, or Myclobutanil starting at bud break.",
        "prevention": "Keep grapevines off the ground. Prune to ensure sunlight reaching center canopy."
    },
    "Grape___Esca_(Black_Measles)": {
        "disease": "Esca (Black Measles)",
        "crop": "Grape",
        "cause": "Fungal complex (Phaeomoniella, Phaeoacremonium)",
        "symptoms": "Interveinal yellowing (tiger-striping) on leaves. Grapes show small round dark spots, skin cracks, and shriveling.",
        "organic": "Prune infected wood during dry periods. Seal large pruning cuts with organic paint/paste.",
        "chemical": "No highly effective chemical cure is available once vine is infected; use wound sealants like Thiophanate-methyl.",
        "prevention": "Disinfect pruning tools between vines. Protect pruning wounds immediately after cutting."
    },
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)": {
        "disease": "Leaf Blight",
        "crop": "Grape",
        "cause": "Pseudocercospora vitis (fungus)",
        "symptoms": "Irregular dark brown patches on leaves, which dry out, crumble, and fall off. Occurs mainly in late summer.",
        "organic": "Clean up fallen leaf litter. Apply copper oxychloride or sulfur sprays in early summer.",
        "chemical": "Azoxystrobin or Carbendazim sprays if disease spreads heavily.",
        "prevention": "Maintain vine vigor through proper fertilizing and irrigation. Avoid overcrowding of leaves."
    },
    "Grape___healthy": {
        "disease": "Healthy",
        "crop": "Grape",
        "cause": "None",
        "symptoms": "Leaves are broad, deep green, and free from spots. Berries are plump and clean.",
        "organic": "Prune annually, mulch to conserve moisture, and use seaweed extracts to improve vigor.",
        "chemical": "No chemical treatments needed.",
        "prevention": "Trellis vines properly for maximum airflow and sun exposure."
    },

    # ORANGE
    "Orange___Haunglongbing_(Citrus_greening)": {
        "disease": "Citrus Greening (HLB)",
        "crop": "Orange",
        "cause": "Candidatus Liberibacter asiaticus (bacterium) spread by Asian Citrus Psyllid",
        "symptoms": "Asymmetrical yellow mottling on leaves. Fruit is small, lopsided, remains green at the bottom, and tastes bitter.",
        "organic": "Remove infected trees to stop spread. Control psyllid vectors with neem oil or horticultural soaps.",
        "chemical": "Control the psyllid vectors using insecticidal sprays like Imidacloprid or Thiamethoxam.",
        "prevention": "Use certified disease-free nursery stock. Inspect trees regularly for psyllids."
    },

    # PEACH
    "Peach___Bacterial_spot": {
        "disease": "Bacterial Spot",
        "crop": "Peach",
        "cause": "Xanthomonas arboricola pv. pruni (bacterium)",
        "symptoms": "Water-soaked lesions on leaf tips or margins, turning dark brown/purple and dropping out to create a 'shot-hole' appearance.",
        "organic": "Apply copper sprays during dormancy and early bloom. Avoid excessive nitrogen fertilizer.",
        "chemical": "Use Oxytetracycline (Mycoshield) or copper bactericides during the growing season.",
        "prevention": "Plant resistant cultivars. Keep trees pruned to ensure rapid drying of leaves."
    },
    "Peach___healthy": {
        "disease": "Healthy",
        "crop": "Peach",
        "cause": "None",
        "symptoms": "Lush green leaves, smooth bark, and healthy developing fruit.",
        "organic": "Apply organic mulch and compost. Spray compost tea to boost leaf microbiome.",
        "chemical": "No chemical treatments needed.",
        "prevention": "Annual winter pruning, avoid overhead watering, and thin fruit to prevent limb breakage."
    },

    # PEPPER BELL
    "Pepper,_bell___Bacterial_spot": {
        "disease": "Bacterial Spot",
        "crop": "Pepper (Bell)",
        "cause": "Xanthomonas campestris pv. vesicatoria (bacterium)",
        "symptoms": "Small, circular, dark spots on the undersides of leaves, which raise and form scabs. Fruit develops rough, raised, brown spots.",
        "organic": "Use copper-based sprays. Remove and burn infected plants immediately.",
        "chemical": "Apply streptomycin or copper fungicides mixed with mancozeb for synergistic control.",
        "prevention": "Use pathogen-free seeds. Rotate crops with non-solanaceous crops for 2-3 years. Avoid overhead watering."
    },
    "Pepper,_bell___healthy": {
        "disease": "Healthy",
        "crop": "Pepper (Bell)",
        "cause": "None",
        "symptoms": "Sturdy green stems, smooth green leaves, and shiny blocky peppers.",
        "organic": "Mulch with straw, feed with organic fish emulsion, and water consistently.",
        "chemical": "No chemical treatments needed.",
        "prevention": "Ensure good drainage, keep garden free of nightshade weeds, and avoid working when plants are wet."
    },

    # POTATO
    "Potato___Early_blight": {
        "disease": "Early Blight",
        "crop": "Potato",
        "cause": "Alternaria solani (fungus)",
        "symptoms": "Dark brown, circular spots with concentric rings ('target' appearance) on older leaves. Can lead to leaf defoliation.",
        "organic": "Apply copper fungicides or compost tea. Mulch around potato plants to prevent soil splashing.",
        "chemical": "Fungicides containing Chlorothalonil, Mancozeb, or Azoxystrobin.",
        "prevention": "Rotate crops. Ensure adequate soil nutrition (especially nitrogen) to keep plants vigorous. Avoid wetting leaves."
    },
    "Potato___Late_blight": {
        "disease": "Late Blight",
        "crop": "Potato",
        "cause": "Phytophthora infestans (oomycete)",
        "symptoms": "Large, dark brown/black water-soaked lesions on leaves. Under humid conditions, white fungal growth appears on leaf undersides.",
        "organic": "Destroy infected tubers. Spray copper sulfate solution preventatively. Harvest on a dry day.",
        "chemical": "Apply systemic fungicides like Metalaxyl, Cymoxanil, or Mancozeb.",
        "prevention": "Plant certified disease-free seed potatoes. Hill soil around plants to protect tubers. Remove volunteer potatoes."
    },
    "Potato___healthy": {
        "disease": "Healthy",
        "crop": "Potato",
        "cause": "None",
        "symptoms": "Lush green foliage and strong upright stems. Tubers are clean and firm.",
        "organic": "Use high-quality compost, practice crop rotation, and mulch with straw.",
        "chemical": "No chemical treatments needed.",
        "prevention": "Ensure well-draining soil and monitor fields regularly, especially during wet/cool weather."
    },

    # RASPBERRY
    "Raspberry___healthy": {
        "disease": "Healthy",
        "crop": "Raspberry",
        "cause": "None",
        "symptoms": "Lush, dark green compound leaves, free from spots or rust patches.",
        "organic": "Apply organic mulch, prune fruiting canes post-harvest, and feed with compost.",
        "chemical": "No chemical treatments needed.",
        "prevention": "Provide a trellis for support, maintain space between canes, and prune dead canes."
    },

    # SOYBEAN
    "Soybean___healthy": {
        "disease": "Healthy",
        "crop": "Soybean",
        "cause": "None",
        "symptoms": "Clean trifoliate green leaves, strong stalks, and healthy pod development.",
        "organic": "Practice crop rotation with corn/wheat. Keep fields clear of broadleaf weeds.",
        "chemical": "No chemical treatments needed.",
        "prevention": "Ensure good soil fertility, plant at recommended seed spacing, and choose disease-resistant seeds."
    },

    # SQUASH
    "Squash___Powdery_mildew": {
        "disease": "Powdery Mildew",
        "crop": "Squash",
        "cause": "Podosphaera xanthii (fungus)",
        "symptoms": "White powdery patches covering both sides of leaves and stems. Affected leaves turn yellow, brown, shrivel and die.",
        "organic": "Spray milk diluted with water (40:60), neem oil, or baking soda solutions.",
        "chemical": "Use fungicides containing Triadimefon, Myclobutanil, or sulfur.",
        "prevention": "Provide adequate spacing. Water the soil directly, not the leaves. Plant in full sun."
    },

    # STRAWBERRY
    "Strawberry___Leaf_scorch": {
        "disease": "Leaf Scorch",
        "crop": "Strawberry",
        "cause": "Diplocarpon earlianum (fungus)",
        "symptoms": "Irregular purplish spots on leaves that eventually enlarge, turn brown, and resemble scorched paper. Leaf margins curl upward.",
        "organic": "Remove old leaves at the end of the harvest. Avoid overhead irrigation.",
        "chemical": "Apply Captan or Thiophanate-methyl fungicides during early flowering stage.",
        "prevention": "Plant resistant cultivars. Keep strawberry beds free of weeds. Do not over-fertilize with nitrogen in spring."
    },
    "Strawberry___healthy": {
        "disease": "Healthy",
        "crop": "Strawberry",
        "cause": "None",
        "symptoms": "Healthy three-lobed leaves with saw-toothed margins, bright white blossoms, and clean red berries.",
        "organic": "Mulch with clean straw to keep berries off soil. Water regularly at the root zone.",
        "chemical": "No chemical treatments needed.",
        "prevention": "Renovate strawberry beds after harvest, remove runners to prevent crowding, and ensure well-draining soil."
    },

    # TOMATO
    "Tomato___Bacterial_spot": {
        "disease": "Bacterial Spot",
        "crop": "Tomato",
        "cause": "Xanthomonas perforans (bacterium)",
        "symptoms": "Small, dark, greasy spots on leaves with yellow halos. Spots can merge, causing leaf death. Fruit develops black, scabby spots.",
        "organic": "Apply copper-based sprays mixed with mancozeb. Prune lower branches to keep foliage off soil.",
        "chemical": "Use streptomycin or copper fungicides preventatively during wet conditions.",
        "prevention": "Use certified pathogen-free seeds. Rotate crop out of nightshade family. Clean stakes and cages."
    },
    "Tomato___Early_blight": {
        "disease": "Early Blight",
        "crop": "Tomato",
        "cause": "Alternaria solani (fungus)",
        "symptoms": "Concentric rings ('target spots') on older leaves. Leaves turn yellow and drop off, exposing fruit to sunscald.",
        "organic": "Mulch the soil, remove infected lower leaves. Spray with copper fungicides or Serenade (Bacillus subtilis).",
        "chemical": "Fungicides like Chlorothalonil, Mancozeb, or Difenoconazole.",
        "prevention": "Practice 3-year crop rotation. Water the base of the plant. Stake plants for airflow."
    },
    "Tomato___Late_blight": {
        "disease": "Late Blight",
        "crop": "Tomato",
        "cause": "Phytophthora infestans (oomycete)",
        "symptoms": "Dark green to black water-soaked patches on leaves that expand rapidly. White fuzzy mold grows on leaf underside in moist weather.",
        "organic": "Destroy infected plants. Spray copper sulfate preventatively when weather is cool and damp.",
        "chemical": "Apply systemic fungicides containing Metalaxyl, Mandipropamid, or Chlorothalonil.",
        "prevention": "Avoid planting near potatoes. Choose resistant varieties. Monitor weather forecasts for blight warnings."
    },
    "Tomato___Leaf_Mold": {
        "disease": "Leaf Mold",
        "crop": "Tomato",
        "cause": "Passalora fulva (fungus)",
        "symptoms": "Pale green or yellow spots on upper leaf surfaces. Velvet-like olive-green to purple mold on leaf undersides in high humidity.",
        "organic": "Increase ventilation in greenhouses. Water early in the day. Spray copper-based fungicides.",
        "chemical": "Fungicides such as Chlorothalonil or Mancozeb.",
        "prevention": "Reduce greenhouse humidity below 85%. Prune to keep canopy open. Clean structure between seasons."
    },
    "Tomato___Septoria_leaf_spot": {
        "disease": "Septoria Leaf Spot",
        "crop": "Tomato",
        "cause": "Septoria lycopersici (fungus)",
        "symptoms": "Numerous small, circular spots with dark borders and gray/white centers on lower leaves, often showing tiny black specks (pycnidia).",
        "organic": "Remove diseased leaves immediately. Apply mulch. Spray copper fungicides or potassium bicarbonate.",
        "chemical": "Fungicides containing Chlorothalonil, Mancozeb, or Azoxystrobin.",
        "prevention": "Avoid overhead watering. Keep plants off the ground. Sterilize garden tools regularly."
    },
    "Tomato___Spider_mites_Two-spotted_spider_mite": {
        "disease": "Two-Spotted Spider Mite",
        "crop": "Tomato",
        "cause": "Tetranychus urticae (pest)",
        "symptoms": "Fine yellow stippling/speckling on leaves. Silky webbing on leaf undersides and stems. Severe infestation causes leaves to dry and bronze.",
        "organic": "Introduce predatory mites (Phytoseiulus persimilis). Spray with insecticidal soap, neem oil, or strong jet of water.",
        "chemical": "Apply acaricides/miticides like Abamectin or Bifenazate.",
        "prevention": "Keep plants well-watered (drought stresses make plants susceptible). Manage weeds near the garden."
    },
    "Tomato___Target_Spot": {
        "disease": "Target Spot",
        "crop": "Tomato",
        "cause": "Corynespora cassiicola (fungus)",
        "symptoms": "Leaf spots with light brown centers and dark brown margins, resembling target boards. Lesions also appear on stems and fruit.",
        "organic": "Prune lower leaves to improve air. Apply biofungicides like Bacillus subtilis.",
        "chemical": "Chlorothalonil, Azoxystrobin, or Boscalid sprays.",
        "prevention": "Do not plant new fields near old crops. Practice crop rotation. Control humidity."
    },
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": {
        "disease": "Tomato Yellow Leaf Curl Virus (TYLCV)",
        "crop": "Tomato",
        "cause": "Begomovirus (virus) transmitted by Silverleaf Whitefly (Bemisia tabaci)",
        "symptoms": "Severe stunting of plants. Leaves curl upward and inward, margins yellow, and leaves appear small and wrinkled. Blossoms drop off.",
        "organic": "Cover young plants with insect netting. Use yellow sticky traps to catch whiteflies. Remove and destroy infected plants.",
        "chemical": "Control whitefly vectors using systemic insecticides like Imidacloprid or Acetamiprid.",
        "prevention": "Grow TYLCV-resistant tomato cultivars. Manage weeds around the perimeter which harbor whiteflies."
    },
    "Tomato___Tomato_mosaic_virus": {
        "disease": "Tomato Mosaic Virus (ToMV)",
        "crop": "Tomato",
        "cause": "Tobamovirus (virus)",
        "symptoms": "Mottled dark-and-light-green ('mosaic') patterns on leaves. Leaves may become narrow and strap-like ('fern-leaf').",
        "organic": "No organic cure exists. Pull out and burn infected plants. Wash hands and tools with milk or soap.",
        "chemical": "No chemical treatments are effective against viruses. Focus on sanitation and disinfection of tools.",
        "prevention": "Purchase certified virus-free seeds. Avoid smoking near plants (tobacco can carry the virus). Disinfect stakes and tools."
    },
    "Tomato___healthy": {
        "disease": "Healthy",
        "crop": "Tomato",
        "cause": "None",
        "symptoms": "Lush green compound leaves, strong stalks, and normal flowers and fruit development.",
        "organic": "Feed with organic tomato fertilizer, water deeply once a week, and mulch with straw.",
        "chemical": "No chemical treatments needed.",
        "prevention": "Stake plants early, prune suckers for airflow, and avoid planting near other solanaceous crops."
    }
}

# Regional translations index dictionary helper
translations = {
    "en": {
        "disease": "Disease",
        "crop": "Crop",
        "cause": "Cause",
        "symptoms": "Symptoms",
        "organic": "Organic Treatment",
        "chemical": "Chemical Treatment",
        "prevention": "Prevention"
    },
    "hi": {
        "disease": "रोग",
        "crop": "फसल",
        "cause": "कारण",
        "symptoms": "लक्षण",
        "organic": "जैविक उपचार",
        "chemical": "रासायनिक उपचार",
        "prevention": "रोकथाम"
    },
    "es": {
        "disease": "Enfermedad",
        "crop": "Cultivo",
        "cause": "Causa",
        "symptoms": "Síntomas",
        "organic": "Tratamiento Orgánico",
        "chemical": "Tratamiento Químico",
        "prevention": "Prevención"
    },
    "pa": {
        "disease": "ਬੀਮਾਰੀ",
        "crop": "ਫ਼ਸਲ",
        "cause": "ਕਾਰਨ",
        "symptoms": "ਲੱਛਣ",
        "organic": "ਜੈਵਿਕ ਇਲਾਜ",
        "chemical": "ਰਸਾਇਣਕ ਇਲਾਜ",
        "prevention": "ਰੋਕਥਾਮ"
    },
    "te": {
        "disease": "వ్యాధి",
        "crop": "పంట",
        "cause": "కారణం",
        "symptoms": "లక్షణాలు",
        "organic": "సేంద్రీయ చికిత్స",
        "chemical": "రసాయన చికిత్స",
        "prevention": "నివారణ"
    }
}
