import { NextResponse } from "next/server";

function getLocalResourceCost(name: string) {
  const normalized = name.toLowerCase().trim();
  
  // Local lookup for common infrastructure services to guarantee 100% price consistency
  if (normalized.includes("aws ec2") || normalized.includes("ec2 instance")) {
    return {
      isValid: true,
      correctedName: "AWS EC2 Instance",
      suggestedCost: 0.12,
      category: "VM",
      message: "AWS EC2 instances are general-purpose compute virtual machines. The standard cost is estimated at $0.12/hr."
    };
  }
  if (normalized.includes("s3") || normalized.includes("simple storage service") || normalized.includes("s3 bucket")) {
    return {
      isValid: true,
      correctedName: "AWS S3 Storage",
      suggestedCost: 0.02,
      category: "Storage",
      message: "AWS Simple Storage Service (S3) bucket. The estimated standard cost is $0.02/hr."
    };
  }
  if (normalized.includes("rds") || normalized.includes("relational database service") || normalized.includes("postgres instance") || normalized.includes("postgresql database")) {
    return {
      isValid: true,
      correctedName: "AWS RDS PostgreSQL Database",
      suggestedCost: 0.15,
      category: "Database",
      message: "AWS Relational Database Service (RDS) running PostgreSQL. The estimated standard cost is $0.15/hr."
    };
  }
  if (normalized.includes("redis") || normalized.includes("elasticache")) {
    return {
      isValid: true,
      correctedName: "AWS ElastiCache Redis Cluster",
      suggestedCost: 0.04,
      category: "Cache",
      message: "AWS ElastiCache Redis cache cluster. The estimated standard cost is $0.04/hr."
    };
  }
  if (normalized.includes("gcp compute") || normalized.includes("gce instance") || normalized.includes("google cloud vm")) {
    return {
      isValid: true,
      correctedName: "GCP Compute Engine VM",
      suggestedCost: 0.10,
      category: "VM",
      message: "Google Cloud Platform Compute Engine Virtual Machine. The estimated standard cost is $0.10/hr."
    };
  }
  if (normalized.includes("azure vm") || normalized.includes("azure virtual machine")) {
    return {
      isValid: true,
      correctedName: "Azure Virtual Machine",
      suggestedCost: 0.10,
      category: "VM",
      message: "Microsoft Azure Virtual Machine compute instance. The estimated standard cost is $0.10/hr."
    };
  }
  if (normalized.includes("openai") || normalized.includes("gpt-4") || normalized.includes("chatgpt")) {
    return {
      isValid: true,
      correctedName: "OpenAI API Service",
      suggestedCost: 0.03,
      category: "LLM",
      message: "OpenAI API service call. Estimated standard usage cost is $0.03/hr equivalent."
    };
  }
  
  return null;
}

export async function POST(req: Request) {
  try {
    const { resourceName } = await req.json();

    if (!resourceName || typeof resourceName !== "string") {
      return NextResponse.json(
        { error: "Invalid resourceName provided" },
        { status: 400 }
      );
    }

    // Check local lookup first for consistent pricing
    const localResult = getLocalResourceCost(resourceName);
    if (localResult) {
      return NextResponse.json(localResult);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const prompt = `You are a Cloud Infrastructure Billing and Specification Expert.
Analyze the following resource input: "${resourceName}".

Please verify the following:
1. Is this a valid, recognized cloud infrastructure service/resource or API (e.g., AWS EC2 instances, GCP Compute Engine, Azure VMs, LLM APIs like OpenAI/Anthropic/Gemini, Database clusters, Redis caches, S3 storage, etc.)?
2. If there are spelling mistakes, missing parts, or incorrect casing (e.g., "aws ec2 instnce" instead of "AWS EC2 Instance", or "g5.2xlrg" instead of "g5.2xlarge"), provide the corrected and professional name.
3. What is the typical or estimated cost range in USD per hour for this resource? Provide a single realistic average cost number (e.g. 0.12, 1.45, 0.00 to indicate free or API-based per token, etc.).
4. What is the category of this resource? Provide a short 1-3 word category name (e.g., "VM", "LLM", "Database", "Storage", "Cache", "SaaS API", etc.).

Respond STRICTLY in raw JSON format. Do NOT wrap the response in markdown blocks, code tags, or triple backticks. The JSON structure must match exactly:
{
  "isValid": boolean,
  "correctedName": string,
  "suggestedCost": number,
  "category": string,
  "message": string
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.0,
          topP: 1.0,
          topK: 1
        }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Gemini API returned error: ${errText}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      return NextResponse.json(
        { error: "No response text received from Gemini API." },
        { status: 500 }
      );
    }

    // Clean any markdown formatting if present
    const cleanedText = resultText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      const parsedData = JSON.parse(cleanedText);
      return NextResponse.json(parsedData);
    } catch (parseError) {
      return NextResponse.json(
        {
          isValid: false,
          correctedName: resourceName,
          suggestedCost: 0,
          category: "Other",
          message: `Could not parse AI response: ${cleanedText}`,
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
