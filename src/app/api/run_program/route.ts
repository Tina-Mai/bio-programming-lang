import { NextResponse } from "next/server";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { program_id } = body;

		if (!program_id) {
			return NextResponse.json({ message: "program_id is required" }, { status: 400 });
		}

		const fastApiBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
		if (!fastApiBackendUrl) {
			console.error("NEXT_PUBLIC_BACKEND_URL is not defined");
			return NextResponse.json({ message: "Backend URL configuration error" }, { status: 500 });
		}

		console.log(`Proxying request for program_id: ${program_id} to FastAPI: ${fastApiBackendUrl}/run-program`);

		const fastApiResponse = await fetch(`${fastApiBackendUrl}/run-program?program_id=${program_id}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				// TODO: add any other headers FastAPI backend might require, e.g. API keys
				// "X-API-Key": process.env.FASTAPI_API_KEY // example
			},
			body: JSON.stringify({}),
		});

		const responseData = await fastApiResponse.json();

		if (!fastApiResponse.ok) {
			console.error(`FastAPI backend error for program_id ${program_id}: status=${fastApiResponse.status} body=${JSON.stringify(responseData, null, 2)}`);
			const errorDetail = responseData.detail || responseData.message || `FastAPI error: ${fastApiResponse.statusText}`;
			return NextResponse.json({ message: errorDetail, ...(typeof responseData === "object" && responseData) }, { status: fastApiResponse.status });
		}

		if (responseData.final_output_id) {
			console.log(`FastAPI backend returned final_output_id: ${responseData.final_output_id} for program_id: ${program_id}`);
			return NextResponse.json({ final_output_id: responseData.final_output_id, status: "complete" }, { status: 200 });
		} else {
			console.error(`FastAPI backend did not return final_output_id for program_id ${program_id}. Response: ${JSON.stringify(responseData)}`);
			return NextResponse.json({ message: "FastAPI backend did not return the expected final_output_id.", details: responseData }, { status: 500 });
		}
	} catch (error) {
		console.error("Error in Next.js proxy /api/run_program:", error);
		const errorMessage = error instanceof Error ? error.message : "An unknown error occurred in proxy";
		return NextResponse.json({ message: `Proxy error: ${errorMessage}` }, { status: 500 });
	}
}
