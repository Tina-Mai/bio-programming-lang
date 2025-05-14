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
			return NextResponse.json(responseData, { status: fastApiResponse.status });
		}

		// successfully proxied, return FastAPI's response
		return NextResponse.json(responseData, { status: fastApiResponse.status });
	} catch (error) {
		console.error("Error in Next.js proxy /api/run_program:", error);
		const errorMessage = error instanceof Error ? error.message : "An unknown error occurred in proxy";
		return NextResponse.json({ message: `Proxy error: ${errorMessage}` }, { status: 500 });
	}
}
