import { describe, expect, it } from "vitest";

import {

  extractProductsFromKnownMappings,

  htmlToWebsiteText,

  mergeProductSuggestions,

  prepareWebsiteTextForSpecialtyAnalysis,

  removeEmbeddedSocialWall,

  sanitizeProductSuggestions,

  scoreCompanyWebsiteSpecialties,

  stripSocialFeedNoise,

} from "@/lib/admin/companyWebsiteSpecialtySuggestions";



const SAMPLE_360_MEDICAL_TEXT = `

360 medical is a trusted healthcare partner delivering innovative surgical and wound care solutions.

licensed tissue bank supporting physicians, hospitals, and surgery centers.

outpatient products membrane wrap amchoplast dermacyte matrix ultramist

surgical hospital products platform innovations acsis endolumik skeletal dynamics biotissue telabio

improved patient outcomes supporting clinicians surgery centers hospitals

`.trim();



const SAMPLE_360_WITH_SOCIAL = `

${SAMPLE_360_MEDICAL_TEXT}

where operational excellence delivers the best clinical outcomes

360 medical + follow 2 weeks ago march is national colorectal cancer awareness month.

over 150,000 americans are diagnosed with colorectal cancer each year #colorectalcancerawareness

read full post on linkedin

outpatient products membrane wrap amchoplast dermacyte matrix ultramist

surgical hospital products platform innovations acsis endolumik skeletal dynamics biotissue telabio

`.trim();



describe("companyWebsiteSpecialtySuggestions", () => {

  it("strips linkedin noise before text extraction", () => {

    const html = `

      <main>Surgical and wound care solutions.</main>

      <a href="https://www.linkedin.com/posts/360medical_colorectal">Colorectal Cancer Awareness Month</a>

      <p>View on LinkedIn</p>

    `;

    const text = htmlToWebsiteText(html);

    expect(text).toContain("surgical and wound care solutions");

    expect(text).not.toContain("linkedin.com");

    expect(text).not.toContain("view on linkedin");

  });



  it("removes embedded social wall but keeps footer product portfolio", () => {

    const cleaned = prepareWebsiteTextForSpecialtyAnalysis(SAMPLE_360_WITH_SOCIAL);

    expect(cleaned).toContain("platform innovations");

    expect(cleaned).toContain("skeletal dynamics");

    expect(cleaned).not.toContain("colorectal cancer awareness");

  });



  it("removes social wall between feed and footer markers", () => {

    const stripped = removeEmbeddedSocialWall(

      "intro text 2 weeks ago linkedin post copy outpatient products membrane wrap end",

    );

    expect(stripped).toContain("intro text");

    expect(stripped).toContain("outpatient products");

    expect(stripped).not.toContain("linkedin post");

  });



  it("scores 360 medical style homepage copy beyond wound care and colorectal social posts", () => {

    const scored = scoreCompanyWebsiteSpecialties(SAMPLE_360_MEDICAL_TEXT, "360 Medical");

    const labels = scored.map((row) => row.label);

    expect(labels).toContain("Wound Care");

    expect(labels).toContain("General Surgery");

    expect(labels).toContain("Hernia Repair");

    expect(labels).toContain("Orthopedics");

    expect(labels).toContain("Bariatric Surgery");

    expect(labels).not.toContain("Colorectal Surgery");

  });



  it("does not surface colorectal after social noise cleanup", () => {

    const cleaned = stripSocialFeedNoise(SAMPLE_360_WITH_SOCIAL);

    const scored = scoreCompanyWebsiteSpecialties(cleaned, "360 Medical");

    expect(scored.map((row) => row.label)).not.toContain("Colorectal Surgery");

  });



  it("extracts 360 medical portfolio with correct specialties and no generic products", () => {

    const prepared = prepareWebsiteTextForSpecialtyAnalysis(SAMPLE_360_MEDICAL_TEXT);

    const products = sanitizeProductSuggestions(extractProductsFromKnownMappings(prepared));

    const byName = new Map(products.map((row) => [row.name, row.specialty]));



    expect(byName.get("ACSIS")).toBe("General Surgery");

    expect(byName.has("Platform Innovations")).toBe(false);

    expect(byName.get("TelaBio")).toBe("Hernia Repair");

    expect(byName.get("Endolumik")).toBe("Bariatric Surgery");

    expect(byName.get("Skeletal Dynamics")).toBe("Orthopedics");

    expect(byName.get("Membrane Wrap")).toBe("Wound Care");

    expect(byName.get("BioTissue")).toBe("Wound Care");

    expect(products.map((row) => row.name)).not.toContain("Amniotic Membrane");

  });



  it("keeps Platform Innovations when ACSIS is absent", () => {

    const text = "surgical hospital products platform innovations telabio";

    const products = sanitizeProductSuggestions(extractProductsFromKnownMappings(text));

    const byName = new Map(products.map((row) => [row.name, row.specialty]));

    expect(byName.get("Platform Innovations")).toBe("General Surgery");

    expect(byName.get("TelaBio")).toBe("Hernia Repair");

  });



  it("overrides AI hernia mislabel for Platform Innovations and drops generic AI products", () => {

    const merged = mergeProductSuggestions(

      extractProductsFromKnownMappings("platform innovations acsis telabio membrane wrap"),

      [

        {

          name: "Platform Innovations",

          specialty: "Hernia Repair",

          description: "A surgical solution that supports various surgical applications.",

          source: "ai",

        },

        {

          name: "Amniotic Membrane",

          specialty: "Wound Care",

          description: "Used in wound management.",

          source: "ai",

        },

        {

          name: "Membrane Wrap-Lite",

          specialty: "Wound Care",

          description: "Lite amniotic matrix for outpatient wound care.",

          source: "ai",

        },

      ],

    );



    const byName = new Map(merged.map((row) => [row.name, row.specialty]));

    expect(byName.get("ACSIS")).toBe("General Surgery");

    expect(byName.has("Platform Innovations")).toBe(false);

    expect(byName.has("Amniotic Membrane")).toBe(false);

    expect(byName.get("Membrane Wrap-Lite")).toBe("Wound Care");

    expect(byName.get("TelaBio")).toBe("Hernia Repair");

  });



  it("merges keyword and ai product suggestions without duplicates", () => {

    const merged = mergeProductSuggestions(

      [{ name: "Endolumik", specialty: "Bariatric Surgery", source: "keywords" }],

      [

        {

          name: "Endolumik",

          specialty: "General Surgery",

          description: "Gastric calibration tube for bariatric procedures",

          source: "ai",

        },

        { name: "Telabio", specialty: "Hernia Repair", source: "ai" },

      ],

    );

    expect(merged).toHaveLength(2);

    expect(merged.find((row) => row.name === "Endolumik")?.specialty).toBe("Bariatric Surgery");

    expect(merged.find((row) => row.name === "Endolumik")?.description).toBe(

      "Gastric calibration tube for bariatric procedures",

    );

    expect(merged.find((row) => row.name === "TelaBio")?.specialty).toBe("Hernia Repair");

  });

});

