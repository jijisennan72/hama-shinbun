import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { pdfId } = await request.json()
    console.log(`[extract-pdf] skipped for pdfId=${pdfId}`)

    // テキスト抽出はスキップ、成功レスポンスを返す
    return NextResponse.json({
      success: true,
      text: '',
      chars: 0,
      message: 'テキスト抽出はスキップされました',
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
