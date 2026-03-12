import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const employees = await prisma.employee.findMany({
      where: { userId: session.user.id },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(employees);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, salary } = await request.json();
    const employee = await prisma.employee.create({
      data: {
        name,
        salary: parseFloat(salary),
        userId: session.user.id
      }
    });
    return NextResponse.json(employee);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}
